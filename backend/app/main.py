from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .routes.image import router as image_router
from .routes.voice import router as voice_router
from .routes.ai import router as ai_router
from .config import AUDIO_DIR
from .services.tts_service import cleanup_old_audio


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def periodic_cleanup():
        while True:
            await asyncio.sleep(3600)
            try:
                cleanup_old_audio()
            except Exception:
                pass
    task = asyncio.create_task(periodic_cleanup())
    yield
    task.cancel()


app = FastAPI(
    title="VoxAI",
    description="AI Voice & Image Generation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(image_router)
app.include_router(voice_router)
app.include_router(ai_router)

app.mount("/static/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


@app.get("/")
async def root():
    return {
        "name": "VoxAI",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "image": "/api/image/generate",
            "tts": "/api/voice/tts",
            "stt": "/api/voice/stt",
            "voices": "/api/voice/voices",
            "refine_prompt": "/api/ai/refine-prompt",
            "generate_script": "/api/ai/generate-script",
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
