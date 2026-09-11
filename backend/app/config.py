import os

from dotenv import load_dotenv

load_dotenv()

MIMO_API_KEY = os.getenv("MIMO_API_KEY", "")
MIMO_BASE_URL = os.getenv("MIMO_BASE_URL", "https://api.jugaar.ai/v1")
MIMO_MODEL = os.getenv("MIMO_MODEL", "mimo-v2.5")

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

IMAGE_MODELS = [
    {"id": "flux", "name": "FLUX", "description": "Black Forest Labs FLUX - high quality"},
    {"id": "zimage", "name": "ZImage", "description": "Default Pollinations model"},
    {"id": "gptimage", "name": "GPT Image", "description": "OpenAI GPT Image via Azure"},
    {"id": "gptimage-large", "name": "GPT Image Large", "description": "Larger GPT Image model"},
    {"id": "ideogram-v4-turbo", "name": "Ideogram V4 Turbo", "description": "Fast Ideogram generation"},
    {"id": "ideogram-v4-quality", "name": "Ideogram V4 Quality", "description": "High quality Ideogram"},
    {"id": "grok-imagine", "name": "Grok Imagine", "description": "xAI Grok image generation"},
    {"id": "seedream5", "name": "Seedream 5", "description": "Seedream 5 model"},
    {"id": "nova-canvas", "name": "Nova Canvas", "description": "Nova Canvas model"},
]
