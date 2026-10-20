from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import rate_limit, require_csrf, require_role
from .db import get_db
from .models import User
from .reports import authorized_report
from .workers_ai import workers_ai_guidance

router = APIRouter()


class ChatInput(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    language: str = "en"
    report_id: str | None = None


GUIDANCE = {
    "en": "To report a concern, add a clear photo, pin the location, choose a category, and submit it. Keep away from immediate danger and contact local emergency services if needed.",
    "fil": "Para mag-ulat ng problema, magdagdag ng malinaw na larawan, ituro ang lokasyon, pumili ng kategorya, at isumite. Lumayo sa agarang panganib at tumawag sa lokal na serbisyong pang-emerhensiya kung kailangan.",
    "taglish": "Para mag-report, add a clear photo, i-pin ang location, piliin ang category, at i-submit. Lumayo sa danger at contact local emergency services kung kailangan.",
}

FILIPINO_STATUSES = {"Pending": "Naghihintay", "Under Verification": "Sinusuri", "Accepted": "Tinanggap",
                     "In Progress": "Isinasagawa", "Resolved": "Nalutas", "Rejected": "Tinanggihan"}

STATUS = {
    "en": "Your report is currently {status}.",
    "fil": "Ang katayuan ng iyong ulat ay {status}.",
    "taglish": "Ang status ng report mo ay {status}.",
}


@router.post("/chat")
def chat(body: ChatInput, request: Request, db: Session = Depends(get_db), user: User = Depends(require_csrf)):
    require_role(user, {"resident"})
    rate_limit(request, "chat", count=30)
    if body.language not in GUIDANCE:
        from fastapi import HTTPException
        raise HTTPException(422, "Unsupported language")
    reply = GUIDANCE[body.language]
    source = "deterministic"
    if body.report_id is not None:
        report = authorized_report(body.report_id, db, user)
        status = FILIPINO_STATUSES.get(report.status, report.status) if body.language == "fil" else report.status
        reply = STATUS[body.language].format(status=status)
    else:
        generated = workers_ai_guidance(body.message, body.language)
        if generated is not None:
            reply = generated
            source = "workers_ai"
    return {"reply": reply, "language": body.language, "llm_available": source == "workers_ai",
            "source": source, "report_id": body.report_id}


