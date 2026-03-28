from __future__ import annotations

import json
from typing import Any

import google.generativeai as genai

from app.core.config import settings


genai.configure(api_key=settings.gemini_api_key)
model = genai.GenerativeModel("gemini-2.0-flash")


def extract_clauses_from_document(file_path: str) -> list[dict[str, Any]]:
    """Uses Gemini to extract structured clauses from an uploaded policy document."""

    uploaded = genai.upload_file(path=file_path)

    prompt = (
        "You are a legal/policy document parser. Extract policy clauses from the provided document.\n\n"
        "Return ONLY valid JSON (no markdown) with this shape:\n"
        "{\n"
        "  \"clauses\": [\n"
        "    {\n"
        "      \"section_number\": \"Section 2(d)\",\n"
        "      \"title\": \"...\",\n"
        "      \"text\": \"full clause text\",\n"
        "      \"prohibited_behaviors\": [\"...\"],\n"
        "      \"severity_level\": \"critical|high|medium|low\"\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Guidelines:\n"
        "- Make section_number as precise as possible if present.\n"
        "- prohibited_behaviors must be a short list of specific behaviors.\n"
        "- severity_level should reflect regulatory importance.\n"
        "- If you are unsure, prefer fewer, cleaner clauses over noisy extraction.\n"
    )

    resp = model.generate_content([prompt, uploaded])
    text = (resp.text or "").strip()
    try:
        data = json.loads(text)
    except Exception:
        # attempt to recover
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            data = json.loads(text[start : end + 1])
        else:
            return []

    clauses = data.get("clauses") if isinstance(data, dict) else None
    if not isinstance(clauses, list):
        return []
    out: list[dict[str, Any]] = []
    for c in clauses:
        if not isinstance(c, dict):
            continue
        out.append(
            {
                "section_number": str(c.get("section_number") or "").strip() or "Unknown",
                "title": str(c.get("title") or "").strip() or "Clause",
                "text": str(c.get("text") or "").strip() or "",
                "prohibited_behaviors": list(c.get("prohibited_behaviors") or []),
                "severity_level": str(c.get("severity_level") or "medium").lower(),
            }
        )
    return out
