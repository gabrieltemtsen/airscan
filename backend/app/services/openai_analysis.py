from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from app.core.config import settings


_client = OpenAI(api_key=settings.openai_api_key)


def analyze_segment_openai(clauses_json: list[dict[str, Any]], segment_text: str) -> list[dict[str, Any]]:
    """Analyze a transcript segment using OpenAI (fallback when Gemini isn't available)."""

    prompt = (
        "You are a broadcast compliance expert for the National Broadcasting Commission of Nigeria. "
        "Analyze the transcript segment for violations of the provided policy clauses. "
        "Return ONLY a JSON array of findings.\n\n"
        "Each finding must have: clause_id, timestamp_start, timestamp_end, quote, explanation, "
        "severity(critical|high|medium|low), confidence(0-1), recommended_action.\n\n"
        "Only flag clear, specific violations. Return [] if none.\n\n"
        f"POLICY_CLAUSES_JSON: {json.dumps(clauses_json, ensure_ascii=False)}\n\n"
        f"TRANSCRIPT_SEGMENT: {segment_text}\n"
    )

    # Use a small/fast model; can be overridden later
    model = getattr(settings, "openai_analysis_model", None) or "gpt-4o-mini"

    res = _client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You output strict JSON only."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
    )

    text = (res.choices[0].message.content or "").strip()

    # Best effort parse
    try:
        data = json.loads(text)
        return data if isinstance(data, list) else []
    except Exception:
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1 and end > start:
            try:
                data = json.loads(text[start : end + 1])
                return data if isinstance(data, list) else []
            except Exception:
                return []
        return []
