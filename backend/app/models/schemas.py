from pydantic import BaseModel, Field


class ImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    model: str = "flux"
    width: int = Field(1024, ge=256, le=2048)
    height: int = Field(1024, ge=256, le=2048)
    seed: int = -1
    safe: bool = False


class ImageResponse(BaseModel):
    url: str
    seed: int
    model: str


class TTSRequest(BaseModel):
    text: str
    voice: str = "af_heart"
    rate: str = "+0%"
    emotion: str = ""


class RefinePromptRequest(BaseModel):
    prompt: str


class RefinePromptResponse(BaseModel):
    original: str
    enhanced: str


class GenerateScriptRequest(BaseModel):
    topic: str
    style: str = "casual"
    length: str = "short"


class GenerateScriptResponse(BaseModel):
    script: str
    expressions: list[str]


class VoiceOption(BaseModel):
    name: str
    short_name: str
    gender: str
    locale: str
    friendly_name: str
    engine: str = ""


class VoicesResponse(BaseModel):
    voices: list[VoiceOption]


class STTResponse(BaseModel):
    text: str
    language: str
    confidence: float


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system_prompt: str = "You are VoxAI, a helpful AI assistant. Be concise and helpful. You can help with image generation prompts, voice scripts, and creative tasks. Keep responses under 300 words."


class ChatResponse(BaseModel):
    reply: str
