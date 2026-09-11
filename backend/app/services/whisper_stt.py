import os
from faster_whisper import WhisperModel
from ..config import WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE

_model = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(
            WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
    return _model


async def transcribe_audio(file_path: str) -> dict:
    model = get_model()
    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        language=None,
        vad_filter=True,
    )

    full_text = " ".join([segment.text for segment in segments])

    return {
        "text": full_text.strip(),
        "language": info.language,
        "confidence": round(info.language_probability, 2),
    }
