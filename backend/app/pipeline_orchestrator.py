"""
Pipeline Orchestrator for SignalHub Phase 1.3.
Central controller for the complete audio processing pipeline.
Manages the flow: Upload → Audio Processing → Transcription → Database Storage
"""
import os
import uuid
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
from fastapi import UploadFile

from .config import settings
from .upload import AudioUploadHandler
from .audio_processor import AudioProcessor
from .whisper_processor import WhisperProcessor
from .db_integration import DatabaseIntegration
from .debug_utils import debug_helper
from .logging_config import log_function_call, PerformanceMonitor
from .models import Call

# Configure logger for this module
logger = logging.getLogger('signalhub.pipeline_orchestrator')


class PipelineStatusTracker:
    """
    Tracks the status of each step in the pipeline.
    Provides real-time debugging information.
    """
    
    def __init__(self):
        self.step_status = {}
        self.step_timings = {}
        self.step_errors = {}
        self.step_results = {}
        logger.info("Pipeline status tracker initialized")
    
    def start_step(self, call_id: str, step_name: str):
        """Mark step as started with timestamp"""
        if call_id not in self.step_status:
            self.step_status[call_id] = {}
            self.step_timings[call_id] = {}
            self.step_errors[call_id] = {}
            self.step_results[call_id] = {}
        
        self.step_status[call_id][step_name] = "running"
        self.step_timings[call_id][step_name] = {
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "duration_seconds": None
        }
        
        logger.info(f"Pipeline step started: {call_id} -> {step_name}")
        debug_helper.log_debug_info(
            "pipeline_step_started",
            {"call_id": call_id, "step_name": step_name}
        )
    
    def complete_step(self, call_id: str, step_name: str, result: Dict):
        """Mark step as completed with results and timing"""
        if call_id in self.step_status and step_name in self.step_status[call_id]:
            self.step_status[call_id][step_name] = "completed"
            
            # Calculate timing
            start_time = datetime.fromisoformat(self.step_timings[call_id][step_name]["start_time"])
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            self.step_timings[call_id][step_name].update({
                "end_time": end_time.isoformat(),
                "duration_seconds": duration
            })
            
            # Store results
            self.step_results[call_id][step_name] = result
            
            logger.info(f"Pipeline step completed: {call_id} -> {step_name} (took {duration:.2f}s)")
            debug_helper.log_debug_info(
                "pipeline_step_completed",
                {
                    "call_id": call_id, 
                    "step_name": step_name, 
                    "duration_seconds": duration,
                    "result_summary": {k: str(v)[:100] + "..." if len(str(v)) > 100 else v 
                                     for k, v in result.items()}
                }
            )
    
    def fail_step(self, call_id: str, step_name: str, error: Exception):
        """Mark step as failed with error details"""
        if call_id in self.step_status and step_name in self.step_status[call_id]:
            self.step_status[call_id][step_name] = "failed"
            
            # Calculate timing
            start_time = datetime.fromisoformat(self.step_timings[call_id][step_name]["start_time"])
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            self.step_timings[call_id][step_name].update({
                "end_time": end_time.isoformat(),
                "duration_seconds": duration
            })
            
            # Store error
            self.step_errors[call_id][step_name] = {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "timestamp": end_time.isoformat()
            }
            
            logger.error(f"Pipeline step failed: {call_id} -> {step_name} (took {duration:.2f}s): {error}")
            debug_helper.log_debug_info(
                "pipeline_step_failed",
                {
                    "call_id": call_id, 
                    "step_name": step_name, 
                    "duration_seconds": duration,
                    "error_type": type(error).__name__,
                    "error_message": str(error)
                }
            )
    
    def get_pipeline_status(self, call_id: str) -> Dict:
        """Get complete pipeline status for debugging"""
        if call_id not in self.step_status:
            return {"error": f"Call ID {call_id} not found in pipeline tracker"}
        
        return {
            "call_id": call_id,
            "step_status": self.step_status[call_id],
            "step_timings": self.step_timings[call_id],
            "step_errors": self.step_errors[call_id],
            "step_results": {k: "Result available" for k in self.step_results[call_id].keys()},
            "overall_status": self._get_overall_status(call_id),
            "total_duration": self._calculate_total_duration(call_id)
        }
    
    def _get_overall_status(self, call_id: str) -> str:
        """Determine overall pipeline status"""
        if call_id not in self.step_status:
            return "not_found"
        
        statuses = self.step_status[call_id].values()
        
        if "failed" in statuses:
            return "failed"
        elif "running" in statuses:
            return "running"
        elif all(status == "completed" for status in statuses):
            return "completed"
        else:
            return "partial"
    
    def _calculate_total_duration(self, call_id: str) -> Optional[float]:
        """Calculate total pipeline duration"""
        if call_id not in self.step_timings:
            return None
        
        total_duration = 0
        for step_timing in self.step_timings[call_id].values():
            if step_timing.get("duration_seconds"):
                total_duration += step_timing["duration_seconds"]
        
        return total_duration


class PipelineDebugLogger:
    """
    Comprehensive logging for pipeline debugging.
    """
    
    def __init__(self):
        self.debug_dir = Path("debug_logs")
        self.debug_dir.mkdir(exist_ok=True)
        logger.info(f"Pipeline debug logger initialized with directory: {self.debug_dir}")
    
    def log_pipeline_start(self, call_id: str, file_info: Dict):
        """Log pipeline start with file information"""
        debug_info = {
            "call_id": call_id,
            "pipeline_start_time": datetime.now().isoformat(),
            "file_info": file_info,
            "pipeline_version": "1.3"
        }
        
        debug_helper.log_debug_info("pipeline_started", debug_info)
        logger.info(f"Pipeline started: {call_id} with file: {file_info.get('filename', 'unknown')}")
    
    def log_pipeline_complete(self, call_id: str, final_result: Dict):
        """Log pipeline completion with summary"""
        debug_info = {
            "call_id": call_id,
            "pipeline_end_time": datetime.now().isoformat(),
            "final_result_summary": {
                k: str(v)[:200] + "..." if len(str(v)) > 200 else v 
                for k, v in final_result.items()
            }
        }
        
        debug_helper.log_debug_info("pipeline_completed", debug_info)
        logger.info(f"Pipeline completed: {call_id}")
    
    def log_pipeline_error(self, call_id: str, error: Exception, step_name: str = None):
        """Log pipeline error with detailed information"""
        debug_info = {
            "call_id": call_id,
            "error_time": datetime.now().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "step_name": step_name
        }
        
        debug_helper.log_debug_info("pipeline_error", debug_info)
        logger.error(f"Pipeline error: {call_id} at step {step_name}: {error}")


class AudioProcessingPipeline:
    """
    Central orchestrator for the complete audio processing pipeline.
    Manages the flow: Upload → Audio Processing → Transcription → Database Storage
    """
    
    def __init__(self):
        # Initialize all components
        self.upload_handler = AudioUploadHandler()
        self.audio_processor = AudioProcessor()
        self.whisper_processor = WhisperProcessor()
        self.db_integration = DatabaseIntegration()
        
        # Initialize tracking and debugging
        self.status_tracker = PipelineStatusTracker()
        self.debug_logger = PipelineDebugLogger()
        
        # Pipeline data store for passing information between steps
        self.pipeline_data = {}
        
        logger.info("Audio processing pipeline initialized successfully")
    
    @log_function_call
    async def process_audio_file(self, file: UploadFile) -> Dict[str, Any]:
        """
        Complete pipeline: Upload → Process → Transcribe → Store
        
        Args:
            file: Uploaded audio file
            
        Returns:
            Complete pipeline result with all processing information
        """
        call_id = str(uuid.uuid4())
        
        # Log pipeline start
        file_info = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": getattr(file, 'size', 'unknown')
        }
        self.debug_logger.log_pipeline_start(call_id, file_info)
        
        try:
            logger.info(f"Starting complete pipeline processing for call: {call_id}")
            
            # Step 1: Upload and Validate
            upload_result = await self._step_upload(file, call_id)
            
            # Step 2: Audio Processing
            processing_result = await self._step_audio_processing(call_id)
            
            # Step 3: Transcription
            transcription_result = await self._step_transcription(call_id)
            
            # Step 4: Database Storage
            storage_result = await self._step_database_storage(call_id)
            
            # Compile final result
            final_result = self._compile_pipeline_result(
                call_id, upload_result, processing_result, 
                transcription_result, storage_result
            )
            
            # Log pipeline completion
            self.debug_logger.log_pipeline_complete(call_id, final_result)
            
            logger.info(f"Pipeline completed successfully for call: {call_id}")
            return final_result
            
        except Exception as e:
            # Log pipeline error
            self.debug_logger.log_pipeline_error(call_id, e)
            await self._handle_pipeline_error(call_id, e)
            raise
    
    async def _step_upload(self, file: UploadFile, call_id: str) -> Dict[str, Any]:
        """
        Step 1: Upload and validate audio file
        """
        self.status_tracker.start_step(call_id, "upload")
        
        try:
            logger.info(f"Step 1: Uploading and validating file for call: {call_id}")
            
            # Validate file
            validation_result = await self.upload_handler.validate_upload(file)
            if not validation_result["is_valid"]:
                raise ValueError(f"File validation failed: {validation_result['errors']}")
            
            # Save file
            file_path = await self.upload_handler.save_audio_file(file, call_id)
            
            # Create call record in database
            db_session = next(self._get_db())
            call_record = await self.upload_handler.create_call_record(
                db_session, file_path, file.filename
            )
            
            # Update database status
            await self.db_integration.update_call_status(call_id, "uploaded")
            
            result = {
                "file_path": file_path,
                "file_info": validation_result["file_info"],
                "validation_passed": True,
                "call_record_created": True
            }
            
            # Store data for next steps
            self.pipeline_data[call_id] = {
                "file_path": file_path,
                "file_info": validation_result["file_info"]
            }
            
            self.status_tracker.complete_step(call_id, "upload", result)
            return result
            
        except Exception as e:
            self.status_tracker.fail_step(call_id, "upload", e)
            await self.db_integration.update_call_status(call_id, "failed", error=str(e))
            raise
    
    async def _step_audio_processing(self, call_id: str) -> Dict[str, Any]:
        """
        Step 2: Process audio file (analysis, conversion, segmentation)
        """
        self.status_tracker.start_step(call_id, "audio_processing")
        
        try:
            logger.info(f"Step 2: Processing audio for call: {call_id}")
            
            # Get file path from database
            file_path = await self._get_file_path(call_id)
            
            # Update status
            await self.db_integration.update_call_status(call_id, "processing")
            
            # Analyze audio with retry logic
            analysis_result = await self._retry_operation(
                lambda: self.audio_processor.analyze_audio_file(file_path),
                operation_name="audio_analysis",
                max_retries=3
            )
            
            # Convert audio if needed with retry logic
            conversion_result = await self._retry_operation(
                lambda: self.audio_processor.convert_audio_format(file_path),
                operation_name="audio_conversion",
                max_retries=2
            )
            
            # Extract segments (optional) with retry logic
            segments_result = await self._retry_operation(
                lambda: self.audio_processor.extract_audio_segments(file_path),
                operation_name="audio_segmentation",
                max_retries=2
            )
            
            result = {
                "analysis": analysis_result,
                "conversion": conversion_result,
                "segments": segments_result,
                "processed_file_path": conversion_result.get("output_path", file_path)
            }
            
            # Update pipeline data with processing results
            if call_id in self.pipeline_data:
                self.pipeline_data[call_id].update({
                    "processed_file_path": conversion_result.get("output_path", file_path),
                    "analysis_result": analysis_result
                })
            
            self.status_tracker.complete_step(call_id, "audio_processing", result)
            return result
            
        except Exception as e:
            self.status_tracker.fail_step(call_id, "audio_processing", e)
            await self.db_integration.update_call_status(call_id, "failed", error=str(e))
            raise
    
    async def _step_transcription(self, call_id: str) -> Dict[str, Any]:
        """
        Step 3: Transcribe audio using Whisper
        """
        self.status_tracker.start_step(call_id, "transcription")
        
        try:
            logger.info(f"Step 3: Transcribing audio for call: {call_id}")
            
            # Get processed audio file path
            audio_path = await self._get_processed_audio_path(call_id)
            
            # Update status
            await self.db_integration.update_call_status(call_id, "transcribing")
            
            # Transcribe audio with retry logic
            transcription_result = await self._retry_operation(
                lambda: self.whisper_processor.transcribe_audio(audio_path),
                operation_name="transcription",
                max_retries=2
            )
            
            # Save transcript
            transcript_path = self.whisper_processor.save_transcript(
                call_id, transcription_result
            )
            
            result = {
                "transcript": transcription_result,
                "transcript_path": transcript_path,
                "transcription_text": transcription_result.get("text", ""),
                "language": transcription_result.get("language", "unknown")
            }
            
            self.status_tracker.complete_step(call_id, "transcription", result)
            return result
            
        except Exception as e:
            self.status_tracker.fail_step(call_id, "transcription", e)
            await self.db_integration.update_call_status(call_id, "failed", error=str(e))
            raise
    
    async def _step_database_storage(self, call_id: str) -> Dict[str, Any]:
        """
        Step 4: Store all results in database
        """
        self.status_tracker.start_step(call_id, "database_storage")
        
        try:
            logger.info(f"Step 4: Storing results in database for call: {call_id}")
            
            # Store transcript with retry logic
            transcript_result = await self._retry_operation(
                lambda: self.db_integration.store_transcript(call_id),
                operation_name="transcript_storage",
                max_retries=3
            )
            
            # Store analysis results with retry logic
            analysis_result = await self._retry_operation(
                lambda: self.db_integration.store_analysis(call_id),
                operation_name="analysis_storage",
                max_retries=3
            )
            
            # Update final status
            await self.db_integration.update_call_status(call_id, "completed")
            
            result = {
                "transcript_stored": transcript_result,
                "analysis_stored": analysis_result,
                "database_operations_completed": True
            }
            
            self.status_tracker.complete_step(call_id, "database_storage", result)
            return result
            
        except Exception as e:
            self.status_tracker.fail_step(call_id, "database_storage", e)
            await self.db_integration.update_call_status(call_id, "failed", error=str(e))
            raise
    
    async def _retry_operation(self, operation_func, operation_name: str, max_retries: int = 3) -> Any:
        """
        Retry an operation with exponential backoff.
        
        Args:
            operation_func: Function to retry
            operation_name: Name of the operation for logging
            max_retries: Maximum number of retry attempts
            
        Returns:
            Result of the operation
            
        Raises:
            Exception: If all retries fail
        """
        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Attempting {operation_name} (attempt {attempt + 1}/{max_retries + 1})")
                return operation_func()
                
            except Exception as e:
                if attempt == max_retries:
                    logger.error(f"{operation_name} failed after {max_retries + 1} attempts: {e}")
                    raise
                
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"{operation_name} failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                await asyncio.sleep(wait_time)
    
    def _compile_pipeline_result(
        self, 
        call_id: str, 
        upload_result: Dict, 
        processing_result: Dict, 
        transcription_result: Dict, 
        storage_result: Dict
    ) -> Dict[str, Any]:
        """
        Compile all step results into final pipeline result
        """
        return {
            "call_id": call_id,
            "pipeline_status": "completed",
            "pipeline_summary": {
                "upload": {
                    "file_path": upload_result.get("file_path"),
                    "file_info": upload_result.get("file_info"),
                    "status": "completed"
                },
                "audio_processing": {
                    "analysis_completed": bool(processing_result.get("analysis")),
                    "conversion_completed": bool(processing_result.get("conversion")),
                    "status": "completed"
                },
                "transcription": {
                    "text_length": len(transcription_result.get("transcription_text", "")),
                    "language": transcription_result.get("language"),
                    "status": "completed"
                },
                "database_storage": {
                    "transcript_stored": storage_result.get("transcript_stored", {}).get("success", False),
                    "analysis_stored": storage_result.get("analysis_stored", {}).get("success", False),
                    "status": "completed"
                }
            },
            "processing_timeline": self.status_tracker.get_pipeline_status(call_id),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_pipeline_error(self, call_id: str, error: Exception):
        """
        Handle pipeline errors gracefully
        """
        logger.error(f"Pipeline error for call {call_id}: {error}")
        
        # Update database status
        try:
            await self.db_integration.update_call_status(call_id, "failed", error=str(error))
        except Exception as db_error:
            logger.error(f"Failed to update database status: {db_error}")
        
        # Log error details
        debug_helper.capture_exception(
            "pipeline_error",
            error,
            {"call_id": call_id, "pipeline_step": "unknown"}
        )
    
    async def _get_file_path(self, call_id: str) -> str:
        """Get file path from database"""
        try:
            db_session = next(self._get_db())
            call_record = db_session.query(Call).filter(Call.call_id == call_id).first()
            
            if not call_record:
                raise ValueError(f"Call record not found for call_id: {call_id}")
            
            if not call_record.file_path:
                raise ValueError(f"No file path found for call_id: {call_id}")
            
            logger.info(f"Retrieved file path for call {call_id}: {call_record.file_path}")
            return call_record.file_path
            
        except Exception as e:
            logger.error(f"Failed to get file path for call {call_id}: {e}")
            raise
    
    async def _get_processed_audio_path(self, call_id: str) -> str:
        """Get processed audio file path from processing results"""
        try:
            # First try to get the original file path
            original_path = await self._get_file_path(call_id)
            
            # Check if processed version exists
            processed_dir = Path(settings.upload_dir) / "processed"
            original_filename = Path(original_path).name
            processed_filename = f"{Path(original_filename).stem}_converted.wav"
            processed_path = processed_dir / processed_filename
            
            # If processed file doesn't exist, use original
            if not processed_path.exists():
                logger.info(f"Processed file not found, using original: {original_path}")
                return original_path
            
            logger.info(f"Using processed audio file: {processed_path}")
            return str(processed_path)
            
        except Exception as e:
            logger.error(f"Failed to get processed audio path for call {call_id}: {e}")
            raise
    
    def _get_db(self):
        """Get database session"""
        from .database import get_db
        return get_db()
    
    def get_pipeline_status(self, call_id: str) -> Dict:
        """Get pipeline status for debugging"""
        return self.status_tracker.get_pipeline_status(call_id)
    
    def get_debug_info(self, call_id: str) -> Dict:
        """Get debug information for troubleshooting"""
        return {
            "pipeline_status": self.get_pipeline_status(call_id),
            "debug_logs": debug_helper.get_debug_info(call_id)
        }
