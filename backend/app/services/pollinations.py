import httpx
import random
import time


LEGACY_BASE = "https://gen.pollinations.ai/image"


async def generate_image(
    prompt: str,
    model: str = "flux",
    width: int = 1024,
    height: int = 1024,
    seed: int = -1,
    safe: bool = False,
) -> dict:
    seed_val = seed if seed >= 0 else random.randint(0, 2**31 - 1)

    params = {
        "model": model,
        "width": width,
        "height": height,
        "seed": seed_val,
        "_t": str(int(time.time() * 1000)),
    }

    if safe:
        params["safe"] = "true"

    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        url = f"{LEGACY_BASE}/{prompt}"
        response = await client.get(url, params=params)

        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After", "30")
            raise ValueError(f"Rate limited. Retry after {retry_after}s")

        if response.status_code != 200:
            error_detail = response.text[:500] if response.text else "Unknown error"
            raise ValueError(f"Image generation failed ({response.status_code}): {error_detail}")

        image_url = str(response.url)

        return {
            "url": image_url,
            "seed": seed_val,
            "model": model,
        }
