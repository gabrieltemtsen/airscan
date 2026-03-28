from __future__ import annotations

import json
import os
import subprocess
import tempfile
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.case import Case, Finding, Transcript
from app.models.policy import PolicyClause
from app.models.user import User
from app.services.gemini import analyze_segment
from app.services.storage import download_to_path, make_object_key, upload_file
from app.services.transcription import transcribe_whisper


VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}

# Whisper supported: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
WHISPER_OK_EXTS = {".flac", ".m4a", ".mp3", ".mp4", ".mpeg", ".mpga", ".oga", ".ogg", ".wav", ".webm"}

def _ensure_whisper_supported(in_path: str, original_name: str, workdir: str) -> str:
    """Convert unsupported audio types (e.g. .aac) to .mp3 for Whisper."""
    ext = os.path.splitext(original_name.lower())[1]
    if ext in WHISPER_OK_EXTS:
        return in_path
    out_path = os.path.join(workdir, "audio_for_whisper.mp3")
    subprocess.check_call(["ffmpeg", "-y", "-i", in_path, "-acodec", "mp3", out_path])
    return out_path


def _is_video(filename: str) -> bool:
    ext = os.path.splitext(filename.lower())[1]
    return ext in VIDEO_EXTS


def _ffprobe_duration(path: str) -> int | None:
    try:
        out = subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            text=True,
        ).strip()
        dur = float(out)
        return int(dur)
    except Exception:
        return None


def _extract_audio(video_path: str, audio_path: str) -> None:
    subprocess.check_call([
        "ffmpeg",
        "-y",
        "-i",
        video_path,
        "-vn",
        "-acodec",
        "mp3",
        audio_path,
    ])


def _chunk_segments(segments: list[dict], window_sec: int = 120) -> list[list[dict]]:
    if not segments:
        return []
    chunks: list[list[dict]] = []
    cur: list[dict] = []
    cur_start = segments[0]["start"]
    for seg in segments:
        if seg["end"] - cur_start > window_sec and cur:
            chunks.append(cur)
            cur = []
            cur_start = seg["start"]
        cur.append(seg)
    if cur:
        chunks.append(cur)
    return chunks


def _segment_text(chunk: list[dict]) -> str:
    lines = []
    for s in chunk:
        lines.append(f"{s['start']:.2f}-{s['end']:.2f}: {s['text']}")
    return "\n".join(lines)


def _load_clauses(db: Session, pack_ids: list[str]) -> list[PolicyClause]:
    # pack_ids stored as strings. Convert via UUID casting by postgres.
    if not pack_ids:
        return []
    return (
        db.query(PolicyClause)
        .filter(PolicyClause.pack_id.in_(pack_ids))
        .order_by(PolicyClause.section_number.asc())
        .all()
    )


def _deduct_usage(user: User, seconds: int) -> None:
    # Beta mode or beta plan: unlimited, no deduction needed.
    if settings.beta_mode or user.plan in ("beta", "starter", "pro", "enterprise"):
        return

    # Free trial: 3 analyses, max 600 seconds each.
    if user.free_analyses_used < 3:
        user.free_analyses_used += 1
        return

    # Express credits
    if user.plan == "express" and user.credits_seconds >= seconds:
        user.credits_seconds -= seconds
        return


def analyze_case(case_id: str) -> None:
    db = SessionLocal()
    try:
        case = db.query(Case).filter(Case.id == case_id).one()
        user = db.query(User).filter(User.id == case.user_id).one()

        # Pre-check limits (skipped entirely in beta mode or for paid/beta plans)
        is_unlimited = settings.beta_mode or user.plan in ("beta", "starter", "pro", "enterprise")
        if not is_unlimited:
            if user.free_analyses_used >= 3 and user.plan == "free":
                case.status = "failed"
                case.error_message = "Free trial used. Top up credits or subscribe."
                db.commit()
                return

        case.status = "processing"
        case.error_message = None
        db.commit()

        with tempfile.TemporaryDirectory() as td:
            in_path = os.path.join(td, "input")
            download_to_path(case.file_url, in_path)

            duration = _ffprobe_duration(in_path)
            case.file_duration_seconds = duration

            # Enforce free trial duration cap (skipped for unlimited users)
            if not is_unlimited and user.free_analyses_used < 3 and duration and duration > 600:
                case.status = "failed"
                case.error_message = "Free trial analyses are limited to 10 minutes."
                db.commit()
                return

            audio_path = in_path
            if _is_video(case.file_name):
                audio_path = os.path.join(td, "audio.mp3")
                _extract_audio(in_path, audio_path)

                # Upload extracted audio
                key = make_object_key(f"{case.id}-audio.mp3")
                case.audio_url = upload_file(audio_path, key, "audio/mpeg")

            # Transcribe (convert unsupported audio like .aac → .mp3)
            whisper_path = _ensure_whisper_supported(audio_path, case.file_name, td)
            t = transcribe_whisper(whisper_path)
            segments = t["segments"]
            full_text = t["text"]

            # Store transcript
            existing = db.query(Transcript).filter(Transcript.case_id == case.id).one_or_none()
            if existing is None:
                existing = Transcript(case_id=case.id, segments=segments, full_text=full_text)
                db.add(existing)
            else:
                existing.segments = segments
                existing.full_text = full_text

            # Load clauses
            clauses = _load_clauses(db, case.policy_pack_ids)
            clauses_json = [
                {
                    "id": str(c.id),
                    "section_number": c.section_number,
                    "title": c.title,
                    "text": c.text,
                    "prohibited_behaviors": c.prohibited_behaviors,
                    "severity_level": c.severity_level,
                }
                for c in clauses
            ]

            # Clear existing findings (re-run)
            db.query(Finding).filter(Finding.case_id == case.id).delete()
            db.commit()

            chunks = _chunk_segments(segments, window_sec=120)
            findings_total: list[dict] = []
            for chunk in chunks:
                seg_text = _segment_text(chunk)
                out = analyze_segment(clauses_json, seg_text)
                if out:
                    findings_total.extend(out)

            # Insert findings
            clause_map = {str(c.id): c for c in clauses}
            for f in findings_total:
                clause_id = str(f.get("clause_id"))
                if clause_id not in clause_map:
                    continue
                sev = (f.get("severity") or clause_map[clause_id].severity_level or "medium").lower()
                rec = f.get("recommended_action") or "Issue Warning"
                db.add(
                    Finding(
                        case_id=case.id,
                        clause_id=clause_map[clause_id].id,
                        timestamp_start=float(f.get("timestamp_start") or 0.0),
                        timestamp_end=float(f.get("timestamp_end") or 0.0),
                        quote=str(f.get("quote") or "").strip(),
                        explanation=str(f.get("explanation") or "").strip(),
                        severity=sev,
                        confidence=float(f.get("confidence") or 0.5),
                        recommended_action=str(rec),
                        reviewer_status="pending",
                    )
                )

            # Usage deduction
            if duration:
                _deduct_usage(user, int(duration))

            case.status = "complete"
            case.completed_at = datetime.utcnow()
            db.commit()

    except Exception as e:
        db.rollback()
        case = db.query(Case).filter(Case.id == case_id).one_or_none()
        if case is not None:
            case.status = "failed"
            case.error_message = str(e)
            db.commit()
        else:
            raise
    finally:
        db.close()
