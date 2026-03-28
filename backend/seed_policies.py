from __future__ import annotations

from app.db.session import SessionLocal
from app.models.policy import PolicyClause, PolicyPack


nbc_clauses = [
    {
        "section_number": "Section 2(2)",
        "title": "Unlicensed Broadcasting",
        "text": "No person shall operate or use any apparatus or premises for the transmission of sound or vision by cable, television, radio, satellite or any other medium of broadcast from anywhere in Nigeria except under and in accordance with the provisions of this Act.",
        "prohibited_behaviors": ["Broadcasting without a licence", "Unauthorized transmission of audio/video content"],
        "severity_level": "critical",
    },
    {
        "section_number": "Section 9(1)(d)",
        "title": "Content Promoting Disunity",
        "text": "The licensed station shall not be used to offend the religious sensibilities or promote ethnicity, sectionalism, hatred and disaffection among the peoples of Nigeria.",
        "prohibited_behaviors": [
            "Promoting ethnic hatred",
            "Offending religious sensibilities",
            "Promoting sectionalism",
            "Broadcasting content causing disaffection among Nigerians",
        ],
        "severity_level": "critical",
    },
    {
        "section_number": "Section 2(1)(g)",
        "title": "Principles of Equity and Fairness",
        "text": "The Commission shall uphold the principles of equity and fairness in broadcasting.",
        "prohibited_behaviors": ["Biased reporting", "Unfair presentation of facts", "One-sided coverage without right of reply"],
        "severity_level": "high",
    },
    {
        "section_number": "Section 2(1)(h)",
        "title": "Broadcast Content Standards",
        "text": "Establishing and disseminating a national broadcasting code and setting standards with regard to the contents and quality of materials for broadcast.",
        "prohibited_behaviors": ["Broadcasting substandard content", "Violating national broadcasting code provisions"],
        "severity_level": "high",
    },
    {
        "section_number": "Section 2(1)(i)",
        "title": "Cultural Promotion",
        "text": "Promoting Nigerian indigenous cultures, moral and community life through broadcasting.",
        "prohibited_behaviors": [
            "Broadcasting content that demeans Nigerian culture",
            "Content that undermines community values",
            "Content contrary to Nigerian morals",
        ],
        "severity_level": "medium",
    },
    {
        "section_number": "Section 2(1)(m)",
        "title": "Harmful and Illegal Broadcasting",
        "text": "Monitoring broadcasting for harmful emission, interference and illegal broadcasting.",
        "prohibited_behaviors": ["Broadcasting harmful content", "Interference with other broadcast signals", "Illegal broadcasting activities"],
        "severity_level": "critical",
    },
    {
        "section_number": "Section 2(1)(l)",
        "title": "Ethical Standards",
        "text": "Regulating ethical standards and technical excellence in public, private and commercial broadcast stations in Nigeria.",
        "prohibited_behaviors": ["Unethical broadcast practices", "Misleading content", "False information presented as fact"],
        "severity_level": "high",
    },
    {
        "section_number": "Section 10",
        "title": "Religious and Political Broadcasting",
        "text": "The Commission shall not grant a licence to a religious organisation or a political party.",
        "prohibited_behaviors": ["Religious organisation broadcasting without licence", "Political party operating broadcast station"],
        "severity_level": "critical",
    },
    {
        "section_number": "Section 9(1)(c)",
        "title": "National Interest Compliance",
        "text": "The licensed station shall be used to promote national interest, unity and cohesion.",
        "prohibited_behaviors": ["Content undermining national unity", "Broadcasting that promotes division", "Content against national interest"],
        "severity_level": "high",
    },
    {
        "section_number": "Section 21",
        "title": "Code of Sanctions",
        "text": "Liability to code of sanctions for breach of broadcasting code and regulations.",
        "prohibited_behaviors": ["Violation of broadcasting code", "Non-compliance with NBC regulations", "Repeated breaches after warning"],
        "severity_level": "high",
    },
]


def seed() -> None:
    db = SessionLocal()
    try:
        pack = (
            db.query(PolicyPack)
            .filter(PolicyPack.is_default.is_(True))
            .filter(PolicyPack.name == "NBC Act 1992 (as amended)")
            .one_or_none()
        )
        if pack is None:
            pack = PolicyPack(
                name="NBC Act 1992 (as amended)",
                version="v1",
                description="Key clauses seeded for compliance analysis.",
                is_default=True,
                created_by=None,
            )
            db.add(pack)
            db.flush()

        # avoid duplicates by section+title
        existing = {
            (c.section_number, c.title)
            for c in db.query(PolicyClause).filter(PolicyClause.pack_id == pack.id).all()
        }

        for c in nbc_clauses:
            key = (c["section_number"], c["title"])
            if key in existing:
                continue
            db.add(
                PolicyClause(
                    pack_id=pack.id,
                    section_number=c["section_number"],
                    title=c["title"],
                    text=c["text"],
                    prohibited_behaviors=c["prohibited_behaviors"],
                    severity_level=c["severity_level"],
                )
            )

        db.commit()
        print("Seeded NBC Act policy pack.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
