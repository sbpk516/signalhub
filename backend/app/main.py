"""
Main FastAPI application for SignalHub.
"""
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import uuid
import asyncio
import logging
import json
import os

from .config import settings, get_database_url, is_live_transcription_enabled, is_live_mic_enabled
from .database import get_db, create_tables
from .models import User, Call, Transcript, Analysis
from .upload import upload_audio_file, get_upload_status
from .pipeline_orchestrator import AudioProcessingPipeline
from .pipeline_monitor import pipeline_monitor
from .debug_utils import debug_helper
from .nlp_processor import nlp_processor
from .db_integration import db_integration
from .live_events import event_bus, sse_format
from .live_mic import live_sessions
from .audio_processor import audio_processor
from .whisper_processor import whisper_processor

# Create necessary directories first
os.makedirs(settings.upload_dir, exist_ok=True)
log_dir = os.path.dirname(settings.log_file) or "."
try:
    os.makedirs(log_dir, exist_ok=True)
except Exception:
    # If settings.log_file resolves to a read-only path, fallback to SIGNALHUB_DATA_DIR/logs
    data_dir = os.getenv("SIGNALHUB_DATA_DIR")
    if data_dir:
        fallback_dir = os.path.join(data_dir, "logs")
        os.makedirs(fallback_dir, exist_ok=True)
        settings.log_file = os.path.join(fallback_dir, os.path.basename(settings.log_file))

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler(settings.log_file)]
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
        # Log resolved database URL (desktop/sqlite shows file path)
        try:
            db_url = get_database_url()
            if db_url.startswith("sqlite"):
                logger.info(f"Using SQLite DB: {db_url}")
            else:
                # Avoid logging credentials; just note the driver
                driver = db_url.split(":", 1)[0]
                logger.info(f"Using database driver: {driver}")
        except Exception:
            pass

        # Create database tables
        create_tables()
        logger.info("Database tables created successfully")

        # Log feature flags
        logger.info(f"Live transcription (SSE) enabled: {is_live_transcription_enabled()}")
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
            "features": {
                "live_transcription": is_live_transcription_enabled(),
                "live_mic": is_live_mic_enabled(),
            },
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
# PHASE 0 (Live SSE): Event stream endpoint + mock producer (feature-flagged)
# ============================================================================

@app.get("/api/v1/transcription/stream")
async def transcription_stream(call_id: str):
    """SSE stream of transcription events for a call.

    Requires SIGNALHUB_LIVE_TRANSCRIPTION=1. If disabled, returns 404.
    """
    if not is_live_transcription_enabled():
        raise HTTPException(status_code=404, detail="Live transcription disabled")

    async def event_generator():
        # Initial ping so clients connect
        yield sse_format("ping", {"ts": datetime.now().isoformat()})
        async for evt in event_bus.subscribe(call_id):
            evt_type = evt.get("type", "partial")
            yield sse_format(evt_type, evt)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/v1/transcription/mock/start")
async def transcription_mock_start(call_id: str, background: BackgroundTasks, chunks: int = 5, interval_ms: int = 800):
    """Start a mock producer that emits N partial events + complete for demo/testing.

    Only active when SIGNALHUB_LIVE_TRANSCRIPTION=1.
    """
    if not is_live_transcription_enabled():
        raise HTTPException(status_code=404, detail="Live transcription disabled")

    async def producer():
        try:
            for i in range(chunks):
                await asyncio.sleep(max(0, interval_ms) / 1000.0)
                text = f" partial-{i+1}"
                await event_bus.publish(call_id, {
                    "type": "partial",
                    "chunk_index": i,
                    "text": text,
                })
            await event_bus.complete(call_id)
        except Exception as e:
            logger.error(f"mock_producer error: {e}")

    background.add_task(producer)
    return {"status": "started", "call_id": call_id, "chunks": chunks, "interval_ms": interval_ms}


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


# ============================================================================
# PHASE A: Mic-based live capture endpoints (feature-flagged)
# ============================================================================

@app.post("/api/v1/live/start")
async def live_start():
    if not is_live_mic_enabled():
        raise HTTPException(status_code=404, detail="Live mic disabled")
    sess = live_sessions.start()
    return {"session_id": sess.session_id}


@app.post("/api/v1/live/chunk")
async def live_chunk(session_id: str, file: UploadFile = File(...)):
    if not is_live_mic_enabled():
        raise HTTPException(status_code=404, detail="Live mic disabled")
    try:
        # Save raw upload to a temp file under session dir
        sess = live_sessions.get(session_id)
        if not sess:
            raise HTTPException(status_code=404, detail="session not found")
        raw_dir = sess.dir / "incoming"
        raw_dir.mkdir(exist_ok=True)
        raw_path = raw_dir / f"{uuid.uuid4()}_{file.filename or 'chunk'}"
        content = await file.read()
        with open(raw_path, 'wb') as f:
            f.write(content)
        idx = live_sessions.add_raw_chunk(session_id, raw_path)

        # Convert to wav mono 16k for Whisper
        converted = audio_processor.convert_audio_format(str(sess.chunks[idx]), output_format="wav", sample_rate=16000, channels=1)
        wav_path = converted.get("output_path") if converted.get("conversion_success") else str(sess.chunks[idx])

        # Transcribe this chunk
        part = whisper_processor.transcribe_audio(wav_path)
        text = part.get("text", "") if part.get("transcription_success") else ""
        live_sessions.set_partial(session_id, idx, text)

        # Emit SSE partial under the same stream (session_id acts as call_id)
        await event_bus.publish(session_id, {
            "type": "partial",
            "call_id": session_id,
            "chunk_index": idx,
            "text": text,
        })
        return {"ok": True, "chunk_index": idx, "text_length": len(text)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"live_chunk failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/live/stop")
async def live_stop(session_id: str):
    if not is_live_mic_enabled():
        raise HTTPException(status_code=404, detail="Live mic disabled")
    try:
        out = live_sessions.stop(session_id)
        await event_bus.complete(session_id)
        return {"session_id": session_id, "final_text": out.get("final_text", "")}
    except KeyError:
        raise HTTPException(status_code=404, detail="session not found")
    except Exception as e:
        logger.error(f"live_stop failed: {e}")
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


@app.post("/api/v1/pipeline/reanalyze/{call_id}")
async def reanalyze_call(call_id: str, db: Session = Depends(get_db)):
    """
    Re-run NLP analysis for an existing call using its stored transcript.
    - Looks up transcript by call_id
    - Runs NLP analysis via nlp_processor
    - Persists results via DatabaseIntegration
    - Returns the newly stored analysis summary

    Note: This adds another entry to the analyses table for the call.
    """
    try:
        logger.info(f"[REANALYZE] Request received for call_id: {call_id}")

        # Validate call exists
        call = db.query(Call).filter(Call.call_id == call_id).first()
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")

        # Get transcript text
        transcript_record = db.query(Transcript).filter(Transcript.call_id == call_id).first()
        if not transcript_record or not (transcript_record.text or '').strip():
            raise HTTPException(status_code=400, detail="No transcript available for this call")

        text = transcript_record.text
        logger.info(f"[REANALYZE] Transcript loaded (len={len(text)}) for call {call_id}")

        # Run NLP analysis
        analysis = await nlp_processor.analyze_text(text, call_id)
        logger.info(f"[REANALYZE] NLP analysis completed for call {call_id}")

        # Store NLP analysis
        store_result = db_integration.store_nlp_analysis(call_id, analysis)
        logger.info(f"[REANALYZE] NLP analysis stored for call {call_id}: success={store_result.get('store_success')}")

        if not store_result.get('store_success'):
            err = store_result.get('error', 'Unknown error while storing analysis')
            raise HTTPException(status_code=500, detail=f"Failed to store analysis: {err}")

        # Build API response
        response = {
            "call_id": call_id,
            "stored": store_result.get("store_success", False),
            "analysis": {
                "sentiment": analysis.get("sentiment", {}),
                "intent": analysis.get("intent", {}),
                "risk": analysis.get("risk", {}),
                "keywords": analysis.get("keywords", [])
            },
            "store_result": store_result
        }

        return {"message": "Reanalysis completed", "data": response, "timestamp": datetime.now().isoformat()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[REANALYZE] Failed for call {call_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to reanalyze call: {str(e)}")


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
    sort: str = "created_at",
    direction: str = "desc",
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get all pipeline results with filtering and pagination.
    
    This is a DEBUG-FIRST implementation with extensive logging.
    """
    try:
        logger.info(
            f"[RESULTS API] Request received - status: {status}, date_from: {date_from}, date_to: {date_to}, "
            f"search: {search}, sort: {sort}, direction: {direction}, limit: {limit}, offset: {offset}"
        )
        
        # Start building base query
        base_query = db.query(Call)
        
        # Apply filters with logging
        if status:
            logger.info(f"[RESULTS API] Applying status filter: {status}")
            base_query = base_query.filter(Call.status == status)
        
        if date_from:
            logger.info(f"[RESULTS API] Applying date_from filter: {date_from}")
            # Convert string to datetime for comparison
            from_date = datetime.fromisoformat(date_from)
            base_query = base_query.filter(Call.created_at >= from_date)
        
        if date_to:
            logger.info(f"[RESULTS API] Applying date_to filter: {date_to}")
            # Convert string to datetime for comparison
            to_date = datetime.fromisoformat(date_to)
            base_query = base_query.filter(Call.created_at <= to_date)
        
        # Get total count before pagination
        total_count = base_query.count()
        logger.info(f"[RESULTS API] Total records found: {total_count}")
        
        # Determine ordering (default: created_at DESC with nulls last)
        order_col = None
        sort_normalized = (sort or "created_at").lower()
        direction_normalized = (direction or "desc").lower()

        if sort_normalized == "created_at":
            order_col = Call.created_at
        else:
            logger.warning(f"[RESULTS API] Unsupported sort field '{sort}'. Falling back to 'created_at'.")
            order_col = Call.created_at

        if direction_normalized not in ("asc", "desc"):
            logger.warning(f"[RESULTS API] Unsupported direction '{direction}'. Falling back to 'desc'.")
            direction_normalized = "desc"

        # Build ordered query with stable tiebreaker and nulls last
        primary_order = (order_col.asc() if direction_normalized == "asc" else order_col.desc()).nullslast()
        tie_breaker = Call.id.asc() if direction_normalized == "asc" else Call.id.desc()

        logger.info(
            f"[RESULTS API] Applying ordering - sort: {sort_normalized} {direction_normalized} (nulls last), tiebreaker on id"
        )

        ordered_query = base_query.order_by(primary_order, tie_breaker)

        # Apply pagination
        paged_query = ordered_query.offset(offset).limit(limit)
        logger.info(f"[RESULTS API] Applied pagination - offset: {offset}, limit: {limit}")
        
        # Execute query
        calls = paged_query.all()
        logger.info(f"[RESULTS API] Retrieved {len(calls)} calls from database")
        if calls:
            try:
                first_created = calls[0].created_at.isoformat() if calls[0].created_at else None
                last_created = calls[-1].created_at.isoformat() if calls[-1].created_at else None
                logger.debug(
                    f"[RESULTS API] Page sample created_at - first: {first_created}, last: {last_created}"
                )
            except Exception as log_err:
                logger.debug(f"[RESULTS API] Unable to log page sample created_at: {log_err}")
        
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
                        "original_filename": getattr(call, 'original_filename', None),
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
                # Parse keywords/topics JSON safely
                try:
                    keywords = json.loads(analysis_record.keywords) if analysis_record.keywords else []
                except Exception:
                    keywords = []
                try:
                    topics = json.loads(analysis_record.topics) if analysis_record.topics else []
                except Exception:
                    topics = []

                analysis = {
                    "sentiment": {
                        "overall": analysis_record.sentiment or "neutral",
                        "score": analysis_record.sentiment_score or 0
                    },
                    "intent": {
                        "detected": analysis_record.intent or "unknown",
                        "confidence": (analysis_record.intent_confidence or 0) / 100.0
                    },
                    "risk": {
                        "escalation_risk": analysis_record.escalation_risk or "low",
                        "risk_score": analysis_record.risk_score or 0,
                        "urgency_level": analysis_record.urgency_level or "low",
                        "compliance_risk": analysis_record.compliance_risk or "none"
                    },
                    "keywords": keywords,
                    "topics": topics
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
                "original_filename": getattr(call, 'original_filename', None),
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


@app.delete("/api/v1/pipeline/results/{call_id}")
async def delete_pipeline_result(call_id: str, db: Session = Depends(get_db)):
    """
    Delete a single pipeline result by call_id.

    - Removes related Transcript and Analysis rows
    - Removes Call row
    - Deletes associated audio files from disk (original and processed)
    """
    try:
        logger.info(f"[RESULTS API] Delete request received for call_id: {call_id}")

        call = db.query(Call).filter(Call.call_id == call_id).first()
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")

        # Track files to delete
        files_deleted = []
        files_errors = []

        # Delete original file if exists
        try:
            if call.file_path and os.path.exists(call.file_path):
                os.remove(call.file_path)
                files_deleted.append(call.file_path)
        except Exception as fe:
            files_errors.append({"file": call.file_path, "error": str(fe)})

        # Delete processed files matching call_id stem
        try:
            from pathlib import Path
            processed_dir = Path(settings.upload_dir) / "processed"
            stem = Path(call.file_path).stem if call.file_path else call_id
            if processed_dir.exists():
                for p in processed_dir.glob(f"{stem}*"):
                    try:
                        os.remove(p)
                        files_deleted.append(str(p))
                    except Exception as pe:
                        files_errors.append({"file": str(p), "error": str(pe)})
        except Exception as pe:
            files_errors.append({"file": "processed_glob", "error": str(pe)})

        # Delete related DB rows (child tables first)
        try:
            db.query(Transcript).filter(Transcript.call_id == call_id).delete()
            db.query(Analysis).filter(Analysis.call_id == call_id).delete()
            db.query(Call).filter(Call.call_id == call_id).delete()
            db.commit()
        except Exception as de:
            db.rollback()
            logger.error(f"[RESULTS API] DB deletion failed for {call_id}: {de}")
            raise HTTPException(status_code=500, detail="Failed to delete database records")

        logger.info(f"[RESULTS API] Deleted call {call_id}. Files removed: {len(files_deleted)}")
        return {
            "message": "Result deleted",
            "data": {
                "call_id": call_id,
                "files_deleted": files_deleted,
                "file_errors": files_errors
            },
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RESULTS API] Critical error in delete_pipeline_result: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete result: {str(e)}")


@app.delete("/api/v1/pipeline/results")
async def clear_all_results(db: Session = Depends(get_db)):
    """
    Clear all pipeline results from the database and remove uploaded/processed files.

    This will:
    - TRUNCATE or delete rows from analyses, transcripts, and calls
    - Remove files under `upload_dir` (and its `processed` subdir)
    """
    try:
        logger.warning("[RESULTS API] CLEAR ALL request received — deleting all results and files")

        # 1) Remove files under upload directory
        file_delete_count = 0
        file_errors = []
        try:
            from pathlib import Path
            base = Path(settings.upload_dir)
            if base.exists():
                for path in sorted(base.rglob("*"), key=lambda p: len(str(p)), reverse=True):
                    # Delete files first, then empty dirs
                    try:
                        if path.is_file():
                            os.remove(path)
                            file_delete_count += 1
                        elif path.is_dir():
                            # Only remove empty directories
                            try:
                                path.rmdir()
                            except OSError:
                                # Directory not empty; continue
                                pass
                    except Exception as fe:
                        file_errors.append({"path": str(path), "error": str(fe)})
        except Exception as e:
            logger.error(f"[RESULTS API] Error clearing files: {e}")
            file_errors.append({"path": str(settings.upload_dir), "error": str(e)})

        # 2) Delete database rows (children first)
        try:
            db.query(Analysis).delete()
            db.query(Transcript).delete()
            db.query(Call).delete()
            db.commit()
        except Exception as de:
            db.rollback()
            logger.error(f"[RESULTS API] DB clear failed: {de}")
            raise HTTPException(status_code=500, detail="Failed to clear database")

        return {
            "message": "All results cleared",
            "data": {
                "files_deleted": file_delete_count,
                "file_errors": file_errors
            },
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RESULTS API] Critical error in clear_all_results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to clear results: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
