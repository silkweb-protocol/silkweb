"""Text-to-Speech proxy — forwards requests to ElevenLabs with server-side API key."""

import httpx
from fastapi import APIRouter, Request, Response

from api.config import settings

router = APIRouter()

ELEVENLABS_API = "https://api.elevenlabs.io/v1/text-to-speech"


@router.post("/api/v1/tts/{voice_id}")
async def tts_proxy(voice_id: str, request: Request):
    """Proxy TTS requests to ElevenLabs without exposing the API key."""
    api_key = getattr(settings, "elevenlabs_api_key", None)
    if not api_key:
        return Response(content="TTS not configured", status_code=503)

    body = await request.body()

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                f"{ELEVENLABS_API}/{voice_id}",
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "xi-api-key": api_key,
                    "Accept": "audio/mpeg",
                },
            )
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                media_type="audio/mpeg",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=86400",
                },
            )
        except Exception:
            return Response(content="TTS request failed", status_code=502)
