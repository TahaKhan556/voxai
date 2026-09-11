import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from ..models.schemas import TTSRequest, VoicesResponse, VoiceOption, STTResponse
from ..services.tts_service import (
    generate_speech,
    list_all_voices,
    get_audio_path,
    EMOTION_PRESETS,
)
from ..services.whisper_stt import transcribe_audio

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.get("/voices")
async def get_voices():
    try:
        voices = list_all_voices()
        return VoicesResponse(voices=[VoiceOption(**v) for v in voices])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list voices: {str(e)}")


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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(file: UploadFile = File(...)):
    try:
        upload_dir = "/tmp/voxai_uploads"
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, file.filename or "upload.wav")
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        result = await transcribe_audio(file_path)

        os.remove(file_path)

        return STTResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")
