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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
