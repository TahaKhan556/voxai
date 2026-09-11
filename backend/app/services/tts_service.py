import os
import uuid
import re
import asyncio
from ..config import AUDIO_DIR


KOKORO_VOICES = {
    "af_heart": {"name": "Heart", "gender": "female", "locale": "en-US", "friendly_name": "Heart (Female, Warm)"},
    "af_bella": {"name": "Bella", "gender": "female", "locale": "en-US", "friendly_name": "Bella (Female, Clear)"},
    "am_adam": {"name": "Adam", "gender": "male", "locale": "en-US", "friendly_name": "Adam (Male, Deep)"},
    "am_michael": {"name": "Michael", "gender": "male", "locale": "en-US", "friendly_name": "Michael (Male, Natural)"},
}

EMOTION_PRESETS = {
    "excited": {"rate": "+30%", "pitch": "+20Hz"},
    "whisper": {"rate": "-20%", "pitch": "-10Hz"},
    "dramatic": {"rate": "-10%", "pitch": "+5Hz"},
    "warm": {"rate": "-5%", "pitch": "+0Hz"},
    "angry": {"rate": "+15%", "pitch": "+10Hz"},
    "sad": {"rate": "-25%", "pitch": "-15Hz"},
    "laughing": {"rate": "+10%", "pitch": "+25Hz"},
    "happy": {"rate": "+10%", "pitch": "+15Hz"},
    "serious": {"rate": "-5%", "pitch": "-5Hz"},
    "playful": {"rate": "+15%", "pitch": "+10Hz"},
    "neutral": {"rate": "+0%", "pitch": "+0Hz"},
    "fearful": {"rate": "+20%", "pitch": "+15Hz"},
    "surprised": {"rate": "+25%", "pitch": "+30Hz"},
    "calm": {"rate": "-10%", "pitch": "-5Hz"},
}

_kokoro_pipeline = None


def _get_kokoro_pipeline():
    global _kokoro_pipeline
    if _kokoro_pipeline is None:
        from kokoro import KPipeline
        _kokoro_pipeline = KPipeline(lang_code="a")
    return _kokoro_pipeline


def _map_voice_name(voice: str) -> str:
    voice_lower = voice.lower()
    for key, info in KOKORO_VOICES.items():
        if voice_lower in key.lower() or voice_lower in info["name"].lower():
            return key
    return "af_heart"


def _parse_rate_to_speed(rate: str) -> float:
    speed = 1.0
    if rate:
        rate_match = re.search(r'([+-]?\d+)', rate)
        if rate_match:
            rate_pct = int(rate_match.group(1))
            if rate.startswith("-"):
                speed = 1.0 - (rate_pct / 100.0)
            else:
                speed = 1.0 + (rate_pct / 100.0)
            speed = max(0.5, min(2.0, speed))
    return speed


def generate_with_kokoro(text: str, voice: str = "af_heart", speed: float = 1.0) -> str:
    pipeline = _get_kokoro_pipeline()
    voice_id = _map_voice_name(voice)

    filename = f"{uuid.uuid4().hex}.wav"
    filepath = os.path.join(AUDIO_DIR, filename)

    audio_chunks = []
    for _, _, audio in pipeline(text, voice=voice_id, speed=speed):
        audio_chunks.append(audio)

    if audio_chunks:
        import numpy as np
        full_audio = np.concatenate(audio_chunks)
        import soundfile as sf
        sf.write(filepath, full_audio, 24000)
    else:
        raise ValueError("Kokoro produced no audio output")

    return filename


def convert_wav_to_mp3(wav_path: str) -> str:
    mp3_path = wav_path.replace(".wav", ".mp3")
    os.system(f'ffmpeg -y -i "{wav_path}" -codec:a libmp3lame -qscale:a 2 "{mp3_path}" 2>/dev/null')
    if os.path.exists(mp3_path):
        os.remove(wav_path)
        return mp3_path
    return wav_path


async def generate_speech(
    text: str,
    voice: str = "af_heart",
    rate: str = "+0%",
    emotion: str = "",
) -> str:
    clean_text = re.sub(r'\[[^\]]+\]', '', text).strip()
    if not clean_text:
        clean_text = text.strip()
    if not clean_text:
        raise ValueError("Empty text")

    final_rate = rate
    if emotion and emotion.lower() in EMOTION_PRESETS:
        final_rate = EMOTION_PRESETS[emotion.lower()]["rate"]

    speed = _parse_rate_to_speed(final_rate)
    filename = await asyncio.to_thread(generate_with_kokoro, clean_text, _map_voice_name(voice), speed)

    wav_path = os.path.join(AUDIO_DIR, filename)
    final_path = convert_wav_to_mp3(wav_path)
    return os.path.basename(final_path)


def list_all_voices() -> list[dict]:
    voices = []
    for key, info in KOKORO_VOICES.items():
        voices.append({
            "name": info["friendly_name"],
            "short_name": key,
            "gender": info["gender"],
            "locale": info["locale"],
            "friendly_name": info["friendly_name"],
            "engine": "kokoro",
        })
    return voices


def get_audio_path(filename: str) -> str:
    return os.path.join(AUDIO_DIR, filename)


def cleanup_old_audio(max_age_seconds: int = 3600):
    import time
    now = time.time()
    if not os.path.exists(AUDIO_DIR):
        return
    for f in os.listdir(AUDIO_DIR):
        filepath = os.path.join(AUDIO_DIR, f)
        if os.path.isfile(filepath):
            if now - os.path.getmtime(filepath) > max_age_seconds:
                os.remove(filepath)
