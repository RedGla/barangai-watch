import logging
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import ai, geo
from .auth import get_current_user, rate_limit, require_csrf, require_role
from .db import get_db
from .media import delete_image, image_response, sanitize_image, save_image
from .models import Report, ReportEvent, User, now, utc_iso

router = APIRouter(prefix="/reports")
# Resident and staff choices (AGENTS.md); the AI (ai.py) suggests from the same eight.
CATEGORIES = {
    "flooding",
    "fallen_trees",
    "broken_streetlights",
    "exposed_wiring",
    "potholes",
    "uncollected_garbage",
    "damaged_signage",
    "other",
}


def serialize_report(report, detail=False):
    result = {
        "id": report.id,
        "resident_id": report.resident_id,
        "description": report.description,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "resident_category": report.resident_category,
        "model_category": report.model_category,
        "verified_category": report.verified_category,
        "prediction_available": bool(report.embedding_model_version),
        "location_label": report.location_label,
        "hazards": report.hazards or [],
        "status": report.status,
        "created_at": utc_iso(report.created_at),
        "updated_at": utc_iso(report.updated_at),
        "image_url": f"/api/reports/{report.id}/image",
    }
    if detail:
        result["events"] = [
            {
                "id": event.id,
                "from_status": event.from_status,
                "to_status": event.to_status,
                "actor_id": event.actor_id,
                "note": event.note,
                "created_at": utc_iso(event.created_at),
            }
            for event in report.events
        ]
        result["actions"] = [
            {
                "id": action.id,
                "actor_id": action.actor_id,
                "kind": action.kind,
                "note": action.note,
                "created_at": utc_iso(action.created_at),
            }
            for action in report.actions
        ]
    return result


def authorized_report(report_id: str, db: Session, user: User):
    report = db.get(Report, report_id)
    if not report or (user.role == "resident" and report.resident_id != user.id):
        raise HTTPException(404, "Report not found")
    return report


def sanitized_upload(image: UploadFile):
    max_bytes = int(os.environ.get("MAX_IMAGE_BYTES", 5_000_000))
    return sanitize_image(image.file.read(max_bytes + 1))


@router.post("/predict")
def preview_prediction(
    request: Request, image: UploadFile = File(...), language: str = Form("en"), user: User = Depends(require_csrf)
):
    """What the AI can fill in from the photo; the resident reviews and edits all of it."""
    require_role(user, {"resident"})
    rate_limit(request, "preview", 20)
    result = ai.analyze(sanitized_upload(image), language if language in {"en", "fil", "taglish"} else "en")
    return {
        "prediction_available": result.available,
        "model_category": result.category,
        "confidence": result.confidence,
        "category_source": result.source,
        "needs_check": result.needs_check,
        "suggested_description": result.description,
        "hazards": list(result.hazards),
    }


@router.post("", status_code=201)
def submit_report(
    request: Request,
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    resident_category: str = Form(...),
    description: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_csrf),
):
    require_role(user, {"resident"})
    rate_limit(request, "upload")
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180) or resident_category not in CATEGORIES:
        raise HTTPException(422, "Invalid location or category")
    sanitized = sanitized_upload(image)
    # The model's category, hazards, embedding and street name come from the server, never the client.
    analysis = ai.for_submission(sanitized)
    report = Report(
        resident_id=user.id,
        latitude=latitude,
        longitude=longitude,
        resident_category=resident_category,
        description=description,
        image_path="",
        location_label=geo.lookup(latitude, longitude) if geo.enabled() else None,
        model_category=analysis.category,
        hazards=list(analysis.hazards) or None,
        image_embedding=analysis.embedding,
        embedding_model_version=analysis.embedding_version,
    )
    db.add(report)
    db.flush()
    db.add(ReportEvent(report_id=report.id, from_status=None, to_status="Pending", actor_id=user.id))
    location = None
    try:
        location = save_image(report.id, sanitized)
        report.image_path = location
        db.commit()
    except Exception:
        db.rollback()
        if location:
            try:
                delete_image(location)
            except Exception:
                logging.getLogger(__name__).error("Could not clean up image for rolled-back report %s", report.id)
        raise
    db.refresh(report)
    return serialize_report(report, detail=True)


@router.get("")
def list_reports(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = select(Report).order_by(Report.created_at.desc())
    if user.role == "resident":
        query = query.where(Report.resident_id == user.id)
    return [serialize_report(report) for report in db.scalars(query)]


@router.get("/{report_id}")
def report_detail(report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return serialize_report(authorized_report(report_id, db, user), detail=True)


@router.get("/{report_id}/image")
def report_image(report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    report = authorized_report(report_id, db, user)
    return image_response(report.image_path)
