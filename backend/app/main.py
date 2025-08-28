"""
Main FastAPI application for SignalHub.
"""
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import logging
import os

from .config import settings
from .database import get_db, create_tables
from .models import User, Call, Transcript, Analysis
from .upload import upload_audio_file, get_upload_status
from .pipeline_orchestrator import AudioProcessingPipeline
from .pipeline_monitor import pipeline_monitor
from .debug_utils import debug_helper

# Create necessary directories first
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs("logs", exist_ok=True)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(settings.log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.project_name,
    description="Real-time call intelligence platform",
    version="1.0.0",
    debug=settings.debug
)

# Add CORS middleware (for future frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info("Starting SignalHub application...")
    try:
        # Create database tables
        create_tables()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


@app.get("/")
async def root():
    """Root endpoint - welcome message."""
    return {
        "message": "Welcome to SignalHub - Contact Center Intelligence Platform",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Test database connection
        db = next(get_db())
        db.execute(text("SELECT 1"))
        db.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unhealthy")


@app.get("/api/v1/status")
async def api_status():
    """API status endpoint."""
    return {
        "api_version": "v1",
        "status": "active",
        "features": {
            "audio_processing": "planned",
            "speech_to_text": "planned", 
            "nlp_analysis": "planned",
            "real_time_processing": "planned"
        },
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/v1/calls")
async def get_calls(db: Session = Depends(get_db)):
    """Get all calls (placeholder for future implementation)."""
    try:
        calls = db.query(Call).all()
        return {
            "calls": [
                {
                    "id": call.id,
                    "call_id": call.call_id,
                    "status": call.status,
                    "created_at": call.created_at.isoformat() if call.created_at else None
                }
                for call in calls
            ],
            "total": len(calls)
        }
    except Exception as e:
        logger.error(f"Failed to get calls: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve calls")


@app.get("/api/v1/calls/{call_id}")
async def get_call(call_id: str, db: Session = Depends(get_db)):
    """Get specific call by ID (placeholder for future implementation)."""
    try:
        call = db.query(Call).filter(Call.call_id == call_id).first()
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {
            "id": call.id,
            "call_id": call.call_id,
            "duration": call.duration,
            "status": call.status,
            "created_at": call.created_at.isoformat() if call.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call {call_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve call")


# ============================================================================
# PHASE 1: AUDIO UPLOAD ENDPOINTS
# ============================================================================

@app.post("/api/v1/upload")
async def upload_endpoint(file: UploadFile = File(...)):
    """
    Upload audio file for processing.
    
    This endpoint accepts audio files and stores them for processing.
    Supported formats: WAV, MP3, M4A, FLAC, OGG, AAC
    Maximum file size: 100MB
    """
    return await upload_audio_file(file)


@app.get("/api/v1/calls/{call_id}/status")
async def get_call_status(call_id: str):
    """
    Get the processing status of a call.
    
    Returns the current status and metadata for a specific call.
    """
    return await get_upload_status(call_id)


# ============================================================================
# PHASE 1.3: ENHANCED PIPELINE ENDPOINTS
# ============================================================================

@app.post("/api/v1/pipeline/upload")
async def pipeline_upload_endpoint(file: UploadFile = File(...)):
    """
    Enhanced upload endpoint with complete pipeline processing.
    
    This endpoint processes audio through the complete pipeline:
    Upload → Audio Processing → Transcription → Database Storage
    """
    try:
        # Initialize pipeline
        pipeline = AudioProcessingPipeline()
        
        # Process audio through complete pipeline
        result = await pipeline.process_audio_file(file)
        
        return {
            "message": "Audio file processed successfully through complete pipeline",
            "call_id": result["call_id"],
            "status": "completed",
            "pipeline_summary": result["pipeline_summary"],
            "processing_timeline": result["processing_timeline"]
        }
        
    except Exception as e:
        logger.error(f"Pipeline processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/pipeline/{call_id}/status")
async def get_pipeline_status(call_id: str):
    """
    Get detailed pipeline status for debugging.
    
    Returns comprehensive status information for each step in the pipeline.
    """
    try:
        pipeline = AudioProcessingPipeline()
        status = pipeline.get_pipeline_status(call_id)
        
        return {
            "call_id": call_id,
            "pipeline_status": status,
            "debug_info": pipeline.get_debug_info(call_id)
        }
        
    except Exception as e:
        logger.error(f"Failed to get pipeline status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/pipeline/{call_id}/debug")
async def get_pipeline_debug(call_id: str):
    """
    Get comprehensive debug information for troubleshooting.
    
    Returns detailed debug logs, timings, and error information.
    """
    try:
        pipeline = AudioProcessingPipeline()
        debug_info = pipeline.get_debug_info(call_id)
        
        return {
            "call_id": call_id,
            "debug_info": debug_info,
            "debug_logs": debug_helper.get_debug_info(call_id),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get debug info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/monitor/active")
async def get_active_pipelines():
    """
    Get currently active pipelines with real-time status.
    
    Returns information about all pipelines currently being processed.
    """
    try:
        active_pipelines = pipeline_monitor.get_active_pipelines()
        
        return {
            "active_pipelines": active_pipelines,
            "count": len(active_pipelines),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get active pipelines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/monitor/history")
async def get_pipeline_history(limit: int = 50):
    """
    Get recent pipeline history.
    
    Returns information about recently completed or failed pipelines.
    """
    try:
        history = pipeline_monitor.get_pipeline_history(limit)
        
        return {
            "pipeline_history": history,
            "count": len(history),
            "limit": limit,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get pipeline history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/monitor/performance")
async def get_performance_summary():
    """
    Get performance summary and system metrics.
    
    Returns comprehensive performance statistics and system resource usage.
    """
    try:
        performance_summary = pipeline_monitor.get_performance_summary()
        
        return {
            "performance_summary": performance_summary,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/monitor/alerts")
async def get_recent_alerts():
    """
    Get recent system alerts.
    
    Returns recent alerts for slow operations, high resource usage, etc.
    """
    try:
        alerts = list(pipeline_monitor.alerts)[-20:]  # Last 20 alerts
        
        return {
            "alerts": alerts,
            "count": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
