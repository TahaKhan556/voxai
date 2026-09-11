import re
import httpx
from ..config import MIMO_API_KEY, MIMO_BASE_URL, MIMO_MODEL


async def _call_ai(messages: list[dict], max_tokens: int = 500, timeout: float = 60.0) -> str:
    if not MIMO_API_KEY:
        raise ValueError("MIMO_API_KEY not set.")

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{MIMO_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {MIMO_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MIMO_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": max_tokens,
            },
        )

        if response.status_code != 200:
            raise ValueError(f"AI request failed ({response.status_code}): {response.text[:300]}")

        data = response.json()
        return data["choices"][0]["message"]["content"]


async def refine_image_prompt(prompt: str) -> str:
    return await _call_ai([
        {"role": "system", "content": "You are an expert AI image prompt engineer. Given a simple user description, enhance it into a detailed, vivid prompt optimized for AI image generation. Add artistic details like lighting, composition, style, mood, and technical quality. Keep it under 200 words. Output ONLY the enhanced prompt, nothing else."},
        {"role": "user", "content": prompt},
    ])


async def generate_voice_script(topic: str, style: str = "casual", length: str = "short") -> dict:
    length_map = {"short": "2-3 sentences", "medium": "4-5 sentences", "long": "6-8 sentences"}
    target_length = length_map.get(length, "2-3 sentences")

    script = await _call_ai([
        {"role": "system", "content": f"You are a professional voice script writer. Create a {target_length} script about the given topic.\nStyle: {style}\nInclude expression markers in [brackets] like: [excited], [thoughtful], [warm], [dramatic], [whisper], [enthusiastic]\nMake it natural and engaging for voice narration. Output ONLY the script with expression markers."},
        {"role": "user", "content": topic},
    ])

    expressions = re.findall(r'\[([^\]]+)\]', script)

    return {
        "script": script.strip(),
        "expressions": list(set(expressions)),
    }


async def chat(messages: list[dict], system_prompt: str = "") -> str:
    all_messages = []
    if system_prompt:
        all_messages.append({"role": "system", "content": system_prompt})
    all_messages.extend(messages)

    return await _call_ai(all_messages, max_tokens=1024, timeout=90.0)
