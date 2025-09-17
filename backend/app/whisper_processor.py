"""
Whisper integration module for SignalHub Phase 1.2.2.
Provides comprehensive speech-to-text functionality using OpenAI Whisper.
"""
import os
import json
try:
    import whisper  # type: ignore
    import torch  # type: ignore
    _WHISPER_AVAILABLE = True
except Exception as _e:  # Whisper/Torch are optional in desktop MVP
    whisper = None  # type: ignore
    torch = None  # type: ignore
    _WHISPER_AVAILABLE = False
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from .config import settings
from .debug_utils import debug_helper
from .logging_config import log_function_call, PerformanceMonitor

# Configure logger for this module
logger = logging.getLogger('signalhub.whisper_processor')

class WhisperProcessor:
    """
    Handles speech-to-text processing using OpenAI Whisper.
    Provides comprehensive transcription with multiple model options.
    """
    
    def __init__(self, model_name: str = "base"):
        """
        Initialize Whisper processor with specified model.
        
        Args:
            model_name: Whisper model size (tiny, base, small, medium, large)
        """
        self.model_name = model_name
        self.model = None
        self.device = "cpu"
        if _WHISPER_AVAILABLE:
            try:
                self.device = "cuda" if torch.cuda.is_available() else "cpu"  # type: ignore[attr-defined]
            except Exception:
                self.device = "cpu"
        
        # Create transcripts directory
        self.transcripts_dir = Path(settings.upload_dir) / "transcripts"
        self.transcripts_dir.mkdir(exist_ok=True)
        
        # Initialize model if libraries available
        if _WHISPER_AVAILABLE:
            self._load_model()
        else:
            logger.warning("Whisper/Torch not available. Transcription disabled.")
        
        logger.info(f"Whisper processor initialized with model: {model_name} on {self.device}")
    
    def _load_model(self) -> bool:
        """
        Load Whisper model with error handling and fallback options.
        
        Returns:
            True if model loaded successfully, False otherwise
        """
        try:
            logger.info(f"Loading Whisper model: {self.model_name}")
            
            with PerformanceMonitor("whisper_model_loading") as monitor:
                # Load model with device specification
                if not _WHISPER_AVAILABLE:
                    raise RuntimeError("Whisper/Torch not available")
                self.model = whisper.load_model(self.model_name, device=self.device)
                
                logger.info(f"Whisper model {self.model_name} loaded successfully on {self.device}")
                
                # Log model information
                debug_helper.log_debug_info(
                    "whisper_model_loaded",
                    {
                        "model_name": self.model_name,
                        "device": self.device,
                        "model_parameters": sum(p.numel() for p in self.model.parameters()),
                        "model_size_mb": sum(p.numel() * p.element_size() for p in self.model.parameters()) / (1024 * 1024)
                    }
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to load Whisper model {self.model_name}: {e}")
            debug_helper.capture_exception(
                "whisper_model_loading",
                e,
                {"model_name": self.model_name, "device": self.device}
            )
            
            # Try fallback to smaller model
            if self.model_name != "tiny":
                logger.info(f"Trying fallback to tiny model...")
                self.model_name = "tiny"
                return self._load_model()
            else:
                logger.error("All model loading attempts failed")
                return False
    
    @log_function_call
    def transcribe_audio(
        self, 
        audio_path: str, 
        language: Optional[str] = None,
        task: str = "transcribe",
        verbose: bool = False
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using Whisper.
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., 'en', 'es', 'fr') or None for auto-detection
            task: Task type ('transcribe' or 'translate')
            verbose: Enable verbose output
            
        Returns:
            Dictionary containing transcription results
        """
        logger.info(f"Starting transcription: {audio_path}")
        
        if not self.model:
            error_msg = "Whisper model not loaded"
            logger.error(error_msg)
            return {
                "audio_path": audio_path,
                "transcription_success": False,
                "error": error_msg,
                "transcription_timestamp": datetime.now().isoformat()
            }
        
        with PerformanceMonitor("whisper_transcription") as monitor:
            try:
                # Verify audio file exists
                if not os.path.exists(audio_path):
                    raise FileNotFoundError(f"Audio file not found: {audio_path}")
                
                # Prepare transcription options
                options = {
                    "task": task,
                    "verbose": verbose,
                    "fp16": False  # Disable fp16 for better compatibility
                }
                
                if language:
                    options["language"] = language
                    logger.info(f"Using specified language: {language}")
                else:
                    logger.info("Auto-detecting language")
                
                logger.debug(f"Transcription options: {options}")
                
                # Perform transcription
                result = self.model.transcribe(audio_path, **options)
                
                # Extract key information
                transcription_data = {
                    "audio_path": audio_path,
                    "transcription_success": True,
                    "text": result.get("text", "").strip(),
                    "language": result.get("language", "unknown"),
                    "language_probability": result.get("language_probability", 0.0),
                    "segments": result.get("segments", []),
                    "transcription_timestamp": datetime.now().isoformat(),
                    "model_used": self.model_name,
                    "device_used": self.device,
                    "task": task
                }
                
                # Calculate additional metrics
                if transcription_data["text"]:
                    transcription_data["word_count"] = len(transcription_data["text"].split())
                    transcription_data["character_count"] = len(transcription_data["text"])
                    transcription_data["confidence_score"] = self._calculate_confidence(result.get("segments", []))
                
                logger.info(f"Transcription completed successfully for {audio_path}")
                logger.info(f"Language detected: {transcription_data['language']} (confidence: {transcription_data['language_probability']:.2f})")
                logger.info(f"Text length: {transcription_data.get('word_count', 0)} words, {transcription_data.get('character_count', 0)} characters")
                
                # Log debug information
                debug_helper.log_debug_info(
                    "whisper_transcription_success",
                    {
                        "audio_path": audio_path,
                        "language": transcription_data["language"],
                        "word_count": transcription_data.get("word_count", 0),
                        "confidence_score": transcription_data.get("confidence_score", 0.0),
                        "model_used": self.model_name
                    }
                )
                
                return transcription_data
                
            except Exception as e:
                logger.error(f"Transcription failed for {audio_path}: {e}")
                debug_helper.capture_exception(
                    "whisper_transcription",
                    e,
                    {"audio_path": audio_path, "language": language, "task": task}
                )
                
                return {
                    "audio_path": audio_path,
                    "transcription_success": False,
                    "error": str(e),
                    "transcription_timestamp": datetime.now().isoformat(),
                    "model_used": self.model_name,
                    "device_used": self.device
                }
    
    def _calculate_confidence(self, segments: List[Dict[str, Any]]) -> float:
        """
        Calculate overall confidence score from segments.
        
        Args:
            segments: List of transcription segments
            
        Returns:
            Average confidence score (0.0 to 1.0)
        """
        if not segments:
            return 0.0
        
        total_confidence = 0.0
        valid_segments = 0
        
        for segment in segments:
            if "avg_logprob" in segment:
                # Convert log probability to confidence (0-1 scale)
                confidence = max(0.0, min(1.0, (segment["avg_logprob"] + 1.0) / 2.0))
                total_confidence += confidence
                valid_segments += 1
        
        return total_confidence / valid_segments if valid_segments > 0 else 0.0
    
    @log_function_call
    def save_transcript(
        self,
        call_id: str,
        transcription_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Save transcription results to file and database.
        
        Args:
            transcription_data: Transcription results from Whisper
            call_id: Unique call identifier
            
        Returns:
            Dictionary with save operation results
        """
        logger.info(f"Saving transcript for call: {call_id}")
        
        try:
            # Create organized directory structure
            today = datetime.now()
            year_month_day = today.strftime("%Y/%m/%d")
            organized_dir = self.transcripts_dir / year_month_day
            organized_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate transcript filename
            transcript_filename = f"{call_id}_transcript.json"
            transcript_path = organized_dir / transcript_filename
            
            # Prepare transcript data for saving
            transcript_data = {
                "call_id": call_id,
                "transcription": transcription_data,
                "metadata": {
                    "created_at": datetime.now().isoformat(),
                    "model_used": transcription_data.get("model_used", "unknown"),
                    "device_used": transcription_data.get("device_used", "unknown"),
                    "file_path": str(transcript_path)
                }
            }
            
            # Save to JSON file
            with open(transcript_path, 'w', encoding='utf-8') as f:
                json.dump(transcript_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Transcript saved to: {transcript_path}")
            
            # Log debug information
            debug_helper.log_debug_info(
                "transcript_saved",
                {
                    "call_id": call_id,
                    "transcript_path": str(transcript_path),
                    "file_size_bytes": transcript_path.stat().st_size,
                    "word_count": transcription_data.get("word_count", 0)
                }
            )
            
            return {
                "call_id": call_id,
                "save_success": True,
                "transcript_path": str(transcript_path),
                "file_size_bytes": transcript_path.stat().st_size,
                "save_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to save transcript for call {call_id}: {e}")
            debug_helper.capture_exception(
                "transcript_save",
                e,
                {"call_id": call_id, "transcription_data_keys": list(transcription_data.keys()) if isinstance(transcription_data, dict) else "Not a dictionary"}
            )
            
            return {
                "call_id": call_id,
                "save_success": False,
                "error": str(e),
                "save_timestamp": datetime.now().isoformat()
            }
    
    @log_function_call
    def get_available_models(self) -> List[str]:
        """
        Get list of available Whisper models.
        
        Returns:
            List of available model names
        """
        return ["tiny", "base", "small", "medium", "large"]
    
    @log_function_call
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the currently loaded model.
        
        Returns:
            Dictionary with model information
        """
        if not self.model:
            return {
                "model_loaded": False,
                "error": "No model loaded"
            }
        
        try:
            # Calculate model size
            total_params = sum(p.numel() for p in self.model.parameters())
            total_size_mb = sum(p.numel() * p.element_size() for p in self.model.parameters()) / (1024 * 1024)
            
            return {
                "model_loaded": True,
                "model_name": self.model_name,
                "device": self.device,
                "total_parameters": total_params,
                "model_size_mb": round(total_size_mb, 2),
                "cuda_available": torch.cuda.is_available(),
                "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
            }
        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return {
                "model_loaded": True,
                "model_name": self.model_name,
                "device": self.device,
                "error": str(e)
            }

# Global Whisper processor instance (using base model for balance of speed/accuracy)
whisper_processor = WhisperProcessor(model_name="base")
