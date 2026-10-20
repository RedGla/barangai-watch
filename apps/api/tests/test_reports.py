from pathlib import Path
from datetime import datetime, timezone

from conftest import register


def submit(client, photo, **fields):
    data = {"latitude": "14.6000", "longitude": "121.0000", "resident_category": "flooding", **fields}
    return client.post("/reports", data=data, files={"image": ("incident.jpg", photo, "image/jpeg")},
                       headers={"X-CSRF-Token": client.cookies.get("csrf_token", "")})


def test_submission_records_pending_and_manual_fallback(client, photo):
    register(client)
    response = submit(client, photo, description="Synthetic flooded lane")
    assert response.status_code == 201, response.text
    report = response.json()
    assert report["status"] == "Pending"
    assert report["prediction_available"] is False
    assert report["model_category"] is None
    assert report["resident_category"] == "flooding"
    assert report["verified_category"] is None
    assert report["events"][0]["to_status"] == "Pending"
    assert datetime.fromisoformat(report["created_at"]).utcoffset() == timezone.utc.utcoffset(None)
    assert datetime.fromisoformat(report["events"][0]["created_at"]).utcoffset() == timezone.utc.utcoffset(None)
    assert len(client.get("/reports").json()) == 1
    assert client.get(f'/reports/{report["id"]}/image').status_code == 200


def test_resident_cannot_read_other_residents_report_or_image(client, photo):
    register(client)
    report_id = submit(client, photo).json()["id"]
    client.cookies.clear()
    register(client, "other@example.test")
    assert client.get(f"/reports/{report_id}").status_code == 404
    assert client.get(f"/reports/{report_id}/image").status_code == 404
    assert client.get("/reports").json() == []


def test_invalid_or_large_image_leaves_no_report_or_media(client, tmp_path, photo, monkeypatch):
    register(client)
    assert submit(client, b"not an image").status_code == 422
    monkeypatch.setenv("MAX_IMAGE_BYTES", "10")
    assert submit(client, photo).status_code == 413
    assert client.get("/reports").json() == []
    assert list(Path(__import__("os").environ["PRIVATE_MEDIA_DIR"]).glob("*")) == []


def test_image_metadata_is_removed(client, photo):
    register(client)
    report_id = submit(client, photo).json()["id"]
    result = client.get(f"/reports/{report_id}/image")
    assert b"private-gps" not in result.content
    assert result.headers["content-type"] == "image/jpeg"


def test_camera_photo_rotation_is_applied_before_stripping_metadata(client):
    import io
    from PIL import Image
    output = io.BytesIO()
    orientation = Image.Exif()
    orientation[274] = 6
    Image.new("RGB", (8, 16), "red").save(output, format="JPEG", exif=orientation)
    register(client)
    report_id = submit(client, output.getvalue()).json()["id"]
    result = client.get(f"/reports/{report_id}/image")
    with Image.open(io.BytesIO(result.content)) as image:
        assert image.size == (16, 8)
        assert not image.getexif()


def test_location_and_category_are_validated(client, photo):
    register(client)
    assert submit(client, photo, latitude="91").status_code == 422
    assert submit(client, photo, resident_category="unknown").status_code == 422
    assert client.get("/reports").json() == []


def test_oversized_unauthenticated_multipart_is_rejected_before_parsing(client, monkeypatch):
    monkeypatch.setenv("MAX_REQUEST_BYTES", "100")
    response = client.post("/reports", files={"image": ("large.jpg", b"x" * 200, "image/jpeg")})
    assert response.status_code == 413
    preview = client.post("/reports/predict", files={"image": ("large.jpg", b"x" * 200, "image/jpeg")})
    assert preview.status_code == 413
