"""
Whisper integration module for SignalHub Phase 1.2.2.
Provides comprehensive speech-to-text functionality using OpenAI Whisper.
"""
import base64
import os
import json
import os
import time
import threading
import tempfile
_MODULE_IMPORT_STARTED = time.perf_counter()
_MODULE_IMPORT_ENDED = None

try:
    import whisper  # type: ignore
    import torch  # type: ignore
    _WHISPER_AVAILABLE = True
except Exception as _e:  # Whisper/Torch optional
    whisper = None  # type: ignore
    torch = None  # type: ignore
    _WHISPER_AVAILABLE = False
from pathlib import Path
from typing import Dict, Any, Optional, List, Generator
from datetime import datetime
import logging

from .config import settings
from .debug_utils import debug_helper
from .audio_processor import audio_processor
from .logging_config import log_function_call, PerformanceMonitor

# Configure logger for this module
logger = logging.getLogger('signalhub.whisper_processor')
_MODULE_IMPORT_ENDED = time.perf_counter()

def _transcription_enabled() -> bool:
    return os.getenv("SIGNALHUB_ENABLE_TRANSCRIPTION", "0") == "1"


def _forced_language() -> Optional[str]:
    """Determine if we should force a language.

    Returns a language code (e.g., 'en') if forcing is enabled, otherwise None.
    Policy:
    - If SIGNALHUB_FORCE_LANGUAGE is set (e.g., 'en'), use it.
    - Else, when running in desktop mode, default to 'en' to improve
      reliability for short/clean English clips without network.
    """
    env_lang = (os.getenv("SIGNALHUB_FORCE_LANGUAGE") or "").strip()
    if env_lang:
        return env_lang
    if os.getenv("SIGNALHUB_MODE", "").lower() == "desktop":
        return "en"
    return None


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
                # Priority: Apple Silicon MPS > NVIDIA CUDA > CPU
                if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                    self.device = "mps"  # Apple Silicon GPU acceleration
                elif torch.cuda.is_available():
                    self.device = "cuda"  # NVIDIA GPU acceleration
                else:
                    self.device = "cpu"
            except Exception:
                self.device = "cpu"

        # Create transcripts directory
        self.transcripts_dir = Path(settings.upload_dir) / "transcripts"
        self.transcripts_dir.mkdir(exist_ok=True)

        # Lazy-load model on first use; warn if disabled or libs missing
        self._model_loaded = False
        self._loading_in_progress = False
        self._loading_started_ts: Optional[float] = None
        self._last_load_elapsed: Optional[float] = None
        self._last_loaded_at: Optional[str] = None
        self._last_load_error: Optional[str] = None
        self._load_lock = threading.Lock()
        if not _transcription_enabled():
            logger.warning("Transcription disabled via SIGNALHUB_ENABLE_TRANSCRIPTION=0")
        if not _WHISPER_AVAILABLE:
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

                self._model_loaded = True
                self._last_load_error = None
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

    def ensure_loaded(self, timeout: Optional[float] = None, *, background: bool = False) -> bool:
        """Ensure the Whisper model is loaded, loading it if necessary."""
        if self._model_loaded:
            return False

        acquired = False
        start_wait = time.perf_counter()
        try:
            if timeout is None:
                self._load_lock.acquire()
                acquired = True
            else:
                acquired = self._load_lock.acquire(timeout=timeout)
            if not acquired:
                waited = time.perf_counter() - start_wait
                self._last_load_error = f"timeout after {waited:.3f}s waiting for Whisper model load lock"
                raise TimeoutError(self._last_load_error)

            if self._model_loaded:
                return False

            self._loading_in_progress = True
            self._loading_started_ts = time.perf_counter()
            logger.info(
                "[WHISPER] model_load status=begin background=%s", background
            )
            success = self._load_model()
            elapsed = time.perf_counter() - (self._loading_started_ts or time.perf_counter())
            self._last_load_elapsed = elapsed
            if success:
                self._last_load_error = None
                self._last_loaded_at = datetime.now().isoformat()
                logger.info(
                    "[WHISPER] model_load status=complete elapsed=%.3fs", elapsed
                )
            else:
                self._last_load_error = "Whisper model failed to load"
                logger.error(
                    "[WHISPER] model_load status=failed elapsed=%.3fs", elapsed
                )
                raise RuntimeError("Whisper model failed to load")
            return success
        finally:
            self._loading_in_progress = False
            self._loading_started_ts = None
            if acquired:
                self._load_lock.release()

    def get_status(self) -> Dict[str, Any]:
        """Return current model status for diagnostics and health reporting."""
        if self._loading_in_progress:
            status = "loading"
        elif self._model_loaded:
            status = "ready"
        else:
            status = "not_loaded"

        return {
            "status": status,
            "loaded": self._model_loaded,
            "loading": self._loading_in_progress,
            "model_name": self.model_name,
            "device": self.device,
            "last_load_elapsed": self._last_load_elapsed,
            "last_loaded_at": self._last_loaded_at,
            "last_error": self._last_load_error,
        }

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
        
        if not _transcription_enabled():
            error_msg = "Transcription disabled (env flag)"
            logger.warning(error_msg)
            return {
                "audio_path": audio_path,
                "transcription_success": False,
                "error": error_msg,
                "transcription_timestamp": datetime.now().isoformat()
            }

        try:
            self.ensure_loaded()
        except TimeoutError as exc:
            error_msg = f"Whisper model load timed out: {exc}"
            logger.error(error_msg)
            return {
                "audio_path": audio_path,
                "transcription_success": False,
                "error": error_msg,
                "transcription_timestamp": datetime.now().isoformat()
            }
        except Exception as exc:
            error_msg = f"Whisper model load failed: {exc}"
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
                # Build options with conservative settings for short clips
                # and offline packaging scenarios.
                options: Dict[str, Any] = {
                    "task": task,
                    "verbose": verbose,
                    "fp16": self.device in ["cuda", "mps"],  # Enable fp16 for GPU acceleration
                    "temperature": 0.0,            # Deterministic decoding
                    "condition_on_previous_text": False,
                    # Lower the speech/no-speech threshold a bit to avoid
                    # empty outputs on short/quiet samples.
                    "no_speech_threshold": 0.3,
                }

                # Apply language selection: prefer explicit arg, else forced policy
                forced_lang = _forced_language()
                lang_to_use = language or forced_lang
                if lang_to_use:
                    options["language"] = lang_to_use
                    if language:
                        logger.info(f"Using specified language: {lang_to_use}")
                    else:
                        logger.info(f"Forcing language via policy: {lang_to_use}")
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

    def transcribe_snippet_from_base64(
        self,
        audio_base64: str,
        *,
        media_type: str = "audio/wav",
        sample_rate: Optional[int] = None,
        max_bytes: int = 5 * 1024 * 1024,
        max_duration_ms: int = 120 * 1000,
    ) -> Dict[str, Any]:
        """Decode a base64 snippet, normalize it, and run Whisper transcription."""

        if not audio_base64 or not isinstance(audio_base64, str):
            raise ValueError("audio_base64 payload is required")

        if not _transcription_enabled():
            raise RuntimeError("Transcription disabled via environment flag")

        try:
            audio_bytes = base64.b64decode(audio_base64, validate=True)
        except Exception as exc:
            logger.warning("Invalid base64 audio payload: %s", exc)
            raise ValueError("audio_base64 payload is not valid base64") from exc

        if len(audio_bytes) == 0:
            raise ValueError("audio_base64 payload is empty")

        if len(audio_bytes) > max_bytes:
            raise ValueError("audio payload exceeds maximum allowed size")

        suffix_map = {
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/mpeg": ".mp3",
            "audio/mp3": ".mp3",
            "audio/ogg": ".ogg",
            "audio/webm": ".webm",
        }
        normalized_media_type = media_type.lower()
        if normalized_media_type not in suffix_map:
            raise ValueError("unsupported media_type")
        suffix = suffix_map[normalized_media_type]

        logger.info(
            "[DICTATION] snippet received size_bytes=%s media_type=%s",
            len(audio_bytes),
            media_type,
        )

        tmp_input = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_input_path = tmp_input.name
        tmp_input.write(audio_bytes)
        tmp_input.close()

        converted_path: Optional[str] = None
        try:
            # Normalize to WAV/mono for whisper for consistent results
            try:
                convert_result = audio_processor.convert_audio_format(
                    tmp_input_path,
                    output_format="wav",
                    sample_rate=sample_rate or 16000,
                    channels=1,
                )
                if not convert_result.get("conversion_success"):
                    raise RuntimeError(convert_result.get("error") or "conversion failed")
                converted_path = convert_result.get("output_path")
            except Exception as exc:
                logger.error("Audio normalization failed: %s", exc)
                raise RuntimeError("Unable to normalize audio snippet") from exc

            analysis = audio_processor.analyze_audio_file(converted_path)
            if not analysis.get("analysis_success"):
                raise RuntimeError("Unable to analyze audio snippet")

            duration_sec = float(analysis.get("duration_seconds", 0.0))
            duration_ms = int(duration_sec * 1000)

            if max_duration_ms and duration_ms > max_duration_ms:
                raise ValueError("audio snippet duration exceeds limit")

            transcription = self.transcribe_audio(converted_path)
            if not transcription.get("transcription_success"):
                raise RuntimeError(transcription.get("error") or "transcription failed")

            text = transcription.get("text", "").strip()
            confidence = float(transcription.get("confidence_score", 0.0))

            logger.info(
                "[DICTATION] snippet transcription complete duration_ms=%s text_len=%s",
                duration_ms,
                len(text),
            )

            return {
                "text": text,
                "confidence": confidence,
                "duration_ms": duration_ms,
            }

        finally:
            try:
                os.unlink(tmp_input_path)
            except Exception:
                pass
            if converted_path and os.path.exists(converted_path):
                try:
                    os.unlink(converted_path)
                except Exception:
                    pass
    
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

    def transcribe_in_chunks(
        self,
        audio_path: str,
        chunk_sec: int = 15,
        stride_sec: int = 5,
        language: Optional[str] = None,
        task: str = "transcribe",
    ) -> Generator[Dict[str, Any], None, Dict[str, Any]]:
        """
        Progressive transcription: yields partial text per chunk and returns a final summary.

        Yields:
            {"chunk_index", "start_sec", "end_sec", "text"}

        Returns (via StopIteration.value):
            Final dict with accumulated text and metadata (same spirit as transcribe_audio).
        """
        logger.info(f"Starting chunked transcription: {audio_path} (chunk={chunk_sec}s, stride={stride_sec}s)")

        if not _transcription_enabled():
            raise RuntimeError("Transcription disabled via env")

        self.ensure_loaded()

        # Determine duration (best-effort)
        try:
            from .audio_processor import audio_processor as _ap
            info = _ap.analyze_audio_file(audio_path)
            total_duration = float(info.get("duration_seconds") or 0.0)
        except Exception:
            total_duration = 0.0

        # Build chunk schedule
        idx = 0
        start = 0.0
        final_text_parts: List[str] = []
        options: Dict[str, Any] = {
            "task": task,
            "verbose": False,
            "fp16": False,
            "temperature": 0.0,
            "condition_on_previous_text": False,
            "no_speech_threshold": 0.3,
        }
        forced_lang = _forced_language()
        lang_to_use = language or forced_lang
        if lang_to_use:
            options["language"] = lang_to_use

        while True:
            end = start + float(chunk_sec)
            # Guard last chunk if total is known
            duration = float(chunk_sec)
            if total_duration and end > total_duration + 0.25:
                # No more audio expected
                break
            # Extract segment
            seg = audio_processor.extract_audio_segment(audio_path, start_time=start, duration=duration, output_format="wav")
            if not seg.get("extraction_success"):
                logger.warning(f"Chunk extraction failed at {start}s: {seg.get('error')}")
                break
            seg_path = seg["output_path"]
            # Transcribe segment
            try:
                result = self.model.transcribe(seg_path, **options)
                text = (result.get("text") or "").strip()
            except Exception as e:
                debug_helper.capture_exception("whisper_chunk_transcription", e, {"start": start, "duration": duration})
                text = ""

            yield {
                "chunk_index": idx,
                "start_sec": round(start, 3),
                "end_sec": round(start + duration, 3),
                "text": text,
            }
            if text:
                final_text_parts.append(text)

            idx += 1
            # Advance with stride (overlap = chunk - stride)
            start += max(0.1, float(chunk_sec - stride_sec))
            if total_duration and start >= total_duration:
                break

        final_text = " ".join(final_text_parts).strip()
        summary = {
            "audio_path": audio_path,
            "transcription_success": True,
            "text": final_text,
            "language": language or "unknown",
            "transcription_timestamp": datetime.now().isoformat(),
            "model_used": self.model_name,
            "device_used": self.device,
            "chunk_count": idx,
        }
        return summary
    
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

# Global Whisper processor instance (using base model with MPS acceleration)
whisper_processor = WhisperProcessor(model_name="base")
