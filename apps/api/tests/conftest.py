import io
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{(tmp_path / 'test.db').as_posix()}")
    monkeypatch.setenv("PRIVATE_MEDIA_DIR", str(tmp_path / "private"))
    monkeypatch.setenv("COOKIE_SECURE", "false")
    monkeypatch.setenv("MEDIA_STORAGE", "local")
    monkeypatch.delenv("CLOUDFLARE_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("CLOUDFLARE_WORKERS_AI_TOKEN", raising=False)
    for name in ("MODEL_CHECKPOINT", "MODEL_APPROVED_SHA256", "MODEL_CONFIDENCE_THRESHOLD",
                 "VALIDATED_EMBEDDING_MODEL_VERSION"):
        monkeypatch.delenv(name, raising=False)
    for name in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"):
        monkeypatch.delenv(name, raising=False)
    from barangai.main import create_app

    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture
def photo():
    output = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(output, format="JPEG", exif=b"Exif\x00\x00private-gps")
    return output.getvalue()


def register(client, email="resident@example.test", password="correct horse battery staple"):
    return client.post("/auth/register", json={"email": email, "password": password})
