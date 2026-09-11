import asyncio
import os

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..models.schemas import STTResponse, TTSRequest, VoiceOption, VoicesResponse
from ..services.tts_service import (
    EMOTION_PRESETS,
    generate_speech,
    get_audio_path,
    list_all_voices,
)
from ..services.whisper_stt import transcribe_audio

router = APIRouter(prefix="/api/voice", tags=["voice"])


def _write_file(path: str, data: bytes) -> None:
    with open(path, "wb") as f:
        f.write(data)


@router.get("/voices")
async def get_voices():
    try:
        voices = list_all_voices()
        return VoicesResponse(voices=[VoiceOption(**v) for v in voices])
    except (OSError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to list voices: {e!s}")


@router.get("/emotions")
async def get_emotions():
    return {"emotions": list(EMOTION_PRESETS.keys())}


@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    try:
        filename = await generate_speech(
            text=req.text,
            voice=req.voice,
            rate=req.rate,
            emotion=req.emotion,
        )
        filepath = get_audio_path(filename)
        return FileResponse(
            path=filepath,
            media_type="audio/mpeg" if filename.endswith(".mp3") else "audio/wav",
            filename=f"voxai_{filename}",
        )
    except (OSError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e!s}")


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(file: UploadFile = File()):  # noqa: B008
    try:
        upload_dir = "/tmp/voxai_uploads"
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, file.filename or "upload.wav")
        content = await file.read()
        await asyncio.to_thread(_write_file, file_path, content)

        result = await transcribe_audio(file_path)

        os.remove(file_path)

        return STTResponse(**result)
    except (OSError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {e!s}")
