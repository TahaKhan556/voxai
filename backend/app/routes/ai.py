from fastapi import APIRouter, HTTPException

from ..models.schemas import (
    ChatRequest,
    ChatResponse,
    GenerateScriptRequest,
    GenerateScriptResponse,
    RefinePromptRequest,
    RefinePromptResponse,
)
from ..services.mimo_ai import chat, generate_voice_script, refine_image_prompt

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        reply = await chat(messages, req.system_prompt)
        return ChatResponse(reply=reply)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (OSError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e!s}")


@router.post("/refine-prompt", response_model=RefinePromptResponse)
async def enhance_prompt(req: RefinePromptRequest):
    try:
        enhanced = await refine_image_prompt(req.prompt)
        return RefinePromptResponse(
            original=req.prompt,
            enhanced=enhanced,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (OSError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=f"Prompt refinement failed: {e!s}")


@router.post("/generate-script", response_model=GenerateScriptResponse)
async def create_script(req: GenerateScriptRequest):
    try:
        result = await generate_voice_script(
            topic=req.topic,
            style=req.style,
            length=req.length,
        )
        return GenerateScriptResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (OSError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=f"Script generation failed: {e!s}")
