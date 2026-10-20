import io
import logging
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException
from fastapi.responses import FileResponse, Response
from PIL import Image, ImageOps, UnidentifiedImageError


class StorageRequestUncertain(HTTPException):
    """The remote operation may have completed before its response failed."""


def media_dir():
    path = Path(os.environ.get("PRIVATE_MEDIA_DIR", str(Path(__file__).resolve().parents[1] / "private_media")))
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_storage_config():
    backend = os.environ.get("MEDIA_STORAGE", "local")
    if backend not in {"local", "supabase"}:
        raise ValueError("MEDIA_STORAGE must be local or supabase")
    if backend == "supabase":
        parsed = urlsplit(os.environ.get("SUPABASE_URL", ""))
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
                or parsed.path not in {"", "/"} or parsed.query or parsed.fragment):
            raise ValueError("SUPABASE_URL must be the HTTPS project origin")
        if not os.environ.get("SUPABASE_SECRET_KEY", "").startswith("sb_secret_"):
            raise ValueError("SUPABASE_SECRET_KEY must be a server-only secret key")
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", os.environ.get("SUPABASE_STORAGE_BUCKET", "incident-photos")):
            raise ValueError("Invalid SUPABASE_STORAGE_BUCKET")


def storage_client():
    return httpx.Client(timeout=20, follow_redirects=False)


def storage_request(method, path, **kwargs):
    validate_storage_config()
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/storage/v1/" + path
    headers = {"apikey": os.environ["SUPABASE_SECRET_KEY"], **kwargs.pop("headers", {})}
    try:
        with storage_client() as client:
            response = client.request(method, url, headers=headers, **kwargs)
        if not response.is_success:
            error = StorageRequestUncertain if response.status_code >= 500 else HTTPException
            raise error(503, "Private image storage unavailable. Please try again.")
        return response
    except httpx.HTTPError:
        raise StorageRequestUncertain(503, "Private image storage unavailable. Please try again.") from None


def private_bucket():
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "incident-photos")
    try:
        metadata = storage_request("GET", f"bucket/{bucket}").json()
    except ValueError:
        raise HTTPException(503, "Private image storage unavailable. Please try again.") from None
    if not isinstance(metadata, dict) or metadata.get("public") is not False:
        raise HTTPException(503, "Incident photo storage must be private")
    return bucket


def save_image(report_id, data):
    name = f"{report_id}.jpg"
    if os.environ.get("MEDIA_STORAGE", "local") == "supabase":
        bucket = private_bucket()
        try:
            storage_request("POST", f"object/{bucket}/{name}", content=data,
                            headers={"Content-Type": "image/jpeg", "x-upsert": "false", "Cache-Control": "private, no-store"})
        except StorageRequestUncertain:
            try:
                delete_image(f"supabase:{name}")
            except Exception:
                logging.getLogger(__name__).error("Could not clean up uncertain upload for report %s", report_id)
            raise
        return f"supabase:{name}"
    path = media_dir() / name
    path.write_bytes(data)
    return str(path)


def object_name(location):
    name = location.removeprefix("supabase:")
    if not re.fullmatch(r"[0-9a-f-]{36}\.jpg", name):
        raise HTTPException(503, "Invalid stored image reference")
    return name


def delete_image(location):
    if location.startswith("supabase:"):
        name = object_name(location)
        bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "incident-photos")
        storage_request("DELETE", f"object/{bucket}", json={"prefixes": [name]})
    else:
        Path(location).unlink(missing_ok=True)


def image_response(location):
    headers = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}
    if location.startswith("supabase:"):
        name = object_name(location)
        bucket = private_bucket()
        data = storage_request("GET", f"object/authenticated/{bucket}/{name}").content
        return Response(data, media_type="image/jpeg", headers=headers)
    if not Path(location).is_file():
        raise HTTPException(404, "Image not found")
    return FileResponse(location, media_type="image/jpeg", headers=headers)


def sanitize_image(data: bytes) -> bytes:
    if len(data) > int(os.environ.get("MAX_IMAGE_BYTES", 5_000_000)):
        raise HTTPException(413, "Image too large")
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"} or image.width * image.height > 20_000_000:
                raise HTTPException(422, "Unsupported image")
            image.load()
            output = io.BytesIO()
            ImageOps.exif_transpose(image).convert("RGB").save(output, format="JPEG", quality=85)
            return output.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "Invalid image")
