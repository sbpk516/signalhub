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


# ============================================================================
# PHASE 2: RESULTS ENDPOINTS (Debug-First Implementation)
# ============================================================================

# Helper function to format file sizes
def _format_file_size(file_size_bytes: int) -> str:
    """Format file size in bytes to human readable format."""
    if not file_size_bytes or file_size_bytes <= 0:
        return "Unknown"
    
    if file_size_bytes < 1024:
        return f"{file_size_bytes} B"
    elif file_size_bytes < 1024 * 1024:
        return f"{file_size_bytes // 1024} KB"
    else:
        return f"{file_size_bytes // (1024 * 1024):.1f} MB"

# Helper function to format duration
def _format_duration(duration_seconds: int) -> str:
    """Format duration in seconds to human readable format."""
    if not duration_seconds or duration_seconds <= 0:
        return "Unknown"
    
    if duration_seconds < 60:
        return f"{duration_seconds}s"
    else:
        minutes = duration_seconds // 60
        seconds = duration_seconds % 60
        return f"{minutes}m {seconds}s"

@app.get("/api/v1/pipeline/results")
async def get_pipeline_results(
    status: str = None,
    date_from: str = None,
    date_to: str = None,
    search: str = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get all pipeline results with filtering and pagination.
    
    This is a DEBUG-FIRST implementation with extensive logging.
    """
    try:
        logger.info(f"[RESULTS API] Request received - status: {status}, date_from: {date_from}, date_to: {date_to}, search: {search}, limit: {limit}, offset: {offset}")
        
        # Start building query
        query = db.query(Call)
        
        # Apply filters with logging
        if status:
            logger.info(f"[RESULTS API] Applying status filter: {status}")
            query = query.filter(Call.status == status)
        
        if date_from:
            logger.info(f"[RESULTS API] Applying date_from filter: {date_from}")
            # Convert string to datetime for comparison
            from_date = datetime.fromisoformat(date_from)
            query = query.filter(Call.created_at >= from_date)
        
        if date_to:
            logger.info(f"[RESULTS API] Applying date_to filter: {date_to}")
            # Convert string to datetime for comparison
            to_date = datetime.fromisoformat(date_to)
            query = query.filter(Call.created_at <= to_date)
        
        # Get total count before pagination
        total_count = query.count()
        logger.info(f"[RESULTS API] Total records found: {total_count}")
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        logger.info(f"[RESULTS API] Applied pagination - offset: {offset}, limit: {limit}")
        
        # Execute query
        calls = query.all()
        logger.info(f"[RESULTS API] Retrieved {len(calls)} calls from database")
        
        # Convert to response format
        results = []
        for call in calls:
            try:
                result = {
                    "call_id": call.call_id,
                    "status": call.status,
                    "created_at": call.created_at.isoformat() if call.created_at else None,
                    "file_info": {
                        "file_path": call.file_path,
                        "file_size_bytes": call.file_size_bytes or 0,
                        "file_size": _format_file_size(call.file_size_bytes)
                    },
                    "audio_analysis": {
                        "duration_seconds": call.duration or 0,
                        "duration": _format_duration(call.duration)
                    },
                    "transcription": None,  # Placeholder - we'll enhance this later
                    "nlp_analysis": None    # Placeholder - we'll enhance this later
                }
                results.append(result)
                logger.debug(f"[RESULTS API] Processed call {call.call_id} successfully")
            except Exception as call_error:
                logger.error(f"[RESULTS API] Error processing call {call.call_id}: {call_error}")
                # Continue processing other calls instead of failing completely
                continue
        
        logger.info(f"[RESULTS API] Successfully processed {len(results)} results")
        
        response = {
            "data": {
                "results": results,
                "total": total_count,
                "page": (offset // limit) + 1,
                "pageSize": limit
            }
        }
        
        logger.info(f"[RESULTS API] Response prepared successfully - returning {len(results)} results out of {total_count} total")
        return response
        
    except Exception as e:
        logger.error(f"[RESULTS API] Critical error in get_pipeline_results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve results: {str(e)}")


@app.get("/api/v1/pipeline/results/{call_id}")
async def get_pipeline_result_detail(
    call_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed information for a specific pipeline result.
    
    This is a DEBUG-FIRST implementation with extensive logging.
    """
    try:
        logger.info(f"[RESULTS API] Detail request received for call_id: {call_id}")
        
        # Get call record
        call = db.query(Call).filter(Call.call_id == call_id).first()
        if not call:
            logger.warning(f"[RESULTS API] Call not found: {call_id}")
            raise HTTPException(status_code=404, detail="Call not found")
        
        logger.info(f"[RESULTS API] Call found: {call_id}, status: {call.status}")
        
        # Get related transcript if exists
        transcript = None
        try:
            transcript_record = db.query(Transcript).filter(Transcript.call_id == call_id).first()
            if transcript_record:
                # Map model field `text` to API field `transcription_text` expected by frontend
                transcript = {
                    "transcription_text": transcript_record.text or "",
                    "confidence": transcript_record.confidence or 0,
                    "language": transcript_record.language or "en"
                }
                logger.info(f"[RESULTS API] Transcript found for call {call_id}")
            else:
                logger.info(f"[RESULTS API] No transcript found for call {call_id}")
        except Exception as transcript_error:
            logger.error(f"[RESULTS API] Error retrieving transcript for call {call_id}: {transcript_error}")
            # Don't fail the entire request if transcript retrieval fails
        
        # Get related analysis if exists
        analysis = None
        try:
            analysis_record = db.query(Analysis).filter(Analysis.call_id == call_id).first()
            if analysis_record:
                analysis = {
                    "sentiment": {
                        "overall": analysis_record.sentiment or "neutral",
                        "score": analysis_record.sentiment_score or 0.0
                    },
                    "intent": {
                        "detected": analysis_record.intent or "unknown"
                    },
                    "keywords": []  # Placeholder - we'll enhance this later
                }
                logger.info(f"[RESULTS API] Analysis found for call {call_id}")
            else:
                logger.info(f"[RESULTS API] No analysis found for call {call_id}")
        except Exception as analysis_error:
            logger.error(f"[RESULTS API] Error retrieving analysis for call {call_id}: {analysis_error}")
            # Don't fail the entire request if analysis retrieval fails
        
        # Build response
        result = {
            "call_id": call.call_id,
            "status": call.status,
            "created_at": call.created_at.isoformat() if call.created_at else None,
            "file_info": {
                "file_path": call.file_path,
                "file_size_bytes": call.file_size_bytes or 0,
                "file_size": _format_file_size(call.file_size_bytes)
            },
            "audio_analysis": {
                "duration_seconds": call.duration or 0,
                "duration": _format_duration(call.duration)
            },
            "transcription": transcript,
            "nlp_analysis": analysis
        }
        
        logger.info(f"[RESULTS API] Successfully prepared detail response for call {call_id}")
        return {"data": result}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RESULTS API] Critical error in get_pipeline_result_detail: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve result details: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
