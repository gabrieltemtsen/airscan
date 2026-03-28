from __future__ import annotations

import json
from typing import Any

import google.generativeai as genai

from app.core.config import settings


genai.configure(api_key=settings.gemini_api_key)
model = genai.GenerativeModel(settings.gemini_model or "gemini-1.5-flash")


def analyze_segment(clauses_json: list[dict[str, Any]], segment_text: str) -> list[dict[str, Any]]:
    prompt = (
        "You are a broadcast compliance expert for the National Broadcasting Commission of Nigeria.\n\n"
        "Analyze the following transcript segment for violations of the provided policy clauses.\n\n"
        "POLICY CLAUSES:\n"
        f"{json.dumps(clauses_json, ensure_ascii=False)}\n\n"
        "TRANSCRIPT SEGMENT (timestamps in seconds):\n"
        f"{segment_text}\n\n"
        "Return a JSON array of findings. Each finding must have:\n"
        "- clause_id: the ID of the violated clause\n"
        "- timestamp_start: start time in seconds\n"
        "- timestamp_end: end time in seconds\n"
        "- quote: exact words from transcript that violate the policy\n"
        "- explanation: why this violates the clause (2-3 sentences, specific)\n"
        "- severity: \"critical\" | \"high\" | \"medium\" | \"low\"\n"
        "- confidence: float 0.0-1.0\n"
        "- recommended_action: \"Issue Warning\" | \"Request Clarification\" | \"Escalate to Commission\" | \"Revoke Notice\"\n\n"
        "Only flag clear, specific violations. Do not flag vague or borderline content.\n"
        "Return [] if no violations found.\n"
    )

    resp = model.generate_content(prompt)
    text = (resp.text or "").strip()

    # Strip code fences if present
    if text.startswith("```"):
        text = text.strip("`")
        # attempt to remove language identifier
        if text.lower().startswith("json"):
            text = text[4:].strip()

    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        return []
    except Exception:
        # best-effort: find first [..]
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                return []
        return []
