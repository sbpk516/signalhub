"""Dictation API endpoints."""
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from ..whisper_processor import whisper_processor
from pydantic import BaseModel, Field

router = APIRouter(prefix="/dictation", tags=["dictation"])


class DictationSnippet(BaseModel):
    """Payload for short-form dictation transcription."""

    audio_base64: str = Field(..., description="Base64-encoded audio snippet")
    sample_rate: Optional[int] = Field(None, description="Sample rate of the snippet in Hz")
    media_type: Optional[str] = Field(
        "audio/wav",
        description="Media (MIME) type of the snippet. Defaults to audio/wav.",
    )


MAX_SNIPPET_DURATION_MS = 120 * 1000  # 2 minutes
ALLOWED_MEDIA_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
    "audio/webm",
}


class DictationResponse(BaseModel):
    """Response returned after transcription."""

    text: str = Field(..., description="Transcribed text")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    duration_ms: int = Field(..., ge=0, description="Duration of the snippet in milliseconds")


@router.post("/transcribe", response_model=DictationResponse, summary="Transcribe a short audio snippet")
async def transcribe_snippet(request: DictationSnippet) -> DictationResponse:
    """Transcribe an audio snippet and return the text + metadata."""

    if request.media_type and request.media_type.lower() not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported media_type")

    try:
        result = whisper_processor.transcribe_snippet_from_base64(
            request.audio_base64,
            media_type=request.media_type or "audio/wav",
            sample_rate=request.sample_rate,
            max_duration_ms=MAX_SNIPPET_DURATION_MS,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return DictationResponse(**result)
