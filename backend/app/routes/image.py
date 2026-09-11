from fastapi import APIRouter, HTTPException
from ..models.schemas import ImageRequest, ImageResponse
from ..services.pollinations import generate_image
from ..config import IMAGE_MODELS

router = APIRouter(prefix="/api/image", tags=["image"])


@router.get("/models")
async def list_models():
    return {"models": IMAGE_MODELS}


@router.post("/generate", response_model=ImageResponse)
async def create_image(req: ImageRequest):
    try:
        result = await generate_image(
            prompt=req.prompt,
            model=req.model,
            width=req.width,
            height=req.height,
            seed=req.seed,
            safe=req.safe,
        )
        return ImageResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")
