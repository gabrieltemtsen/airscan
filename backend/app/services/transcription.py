from __future__ import annotations

from typing import Any

from openai import OpenAI

from app.core.config import settings


client = OpenAI(api_key=settings.openai_api_key)


def transcribe_whisper(file_path: str) -> dict[str, Any]:
    """Return dict with keys: segments(list), text(str)."""
    with open(file_path, "rb") as f:
        # verbose_json includes segments with timestamps
        res = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
        )
    data = res.model_dump() if hasattr(res, "model_dump") else dict(res)
    segments = data.get("segments") or []
    text = data.get("text") or ""
    norm_segments = []
    for s in segments:
        norm_segments.append(
            {
                "start": float(s.get("start", 0.0)),
                "end": float(s.get("end", 0.0)),
                "text": (s.get("text") or "").strip(),
                "speaker": None,
            }
        )
    return {"segments": norm_segments, "text": text.strip()}
