"""Opt-in integration proof using the private reviewed checkpoint, never downloaded by tests."""

import os
from pathlib import Path

import pytest

from conftest import register
from test_reports import submit


@pytest.mark.skipif(not os.environ.get("BARANGAI_TEST_CHECKPOINT"), reason="Private real-model test is opt-in")
def test_real_checkpoint_preview_and_manual_category_persist(client, photo, monkeypatch):
    pytest.importorskip("torch")
    pytest.importorskip("torchvision")
    from barangai import inference

    checkpoint = Path(os.environ["BARANGAI_TEST_CHECKPOINT"])
    assert checkpoint.is_file()
    monkeypatch.setenv("MODEL_CHECKPOINT", str(checkpoint))
    monkeypatch.setenv("MODEL_APPROVED_SHA256", "06b5ad7c02112c599c056b9be52fe771a3bdfdb08577897d1a962c1dd2c1f409")
    monkeypatch.setenv("MODEL_CONFIDENCE_THRESHOLD", "0.8")
    inference.validate_configured_model()
    register(client)
    preview = client.post("/reports/predict", files={"image": ("synthetic.jpg", photo, "image/jpeg")},
                          headers={"X-CSRF-Token": client.cookies["csrf_token"]})
    assert preview.status_code == 200
    assert preview.json()["prediction_available"] is True
    assert 0 <= preview.json()["confidence"] <= 1
    saved = submit(client, photo, resident_category="fallen_trees")
    assert saved.status_code == 201
    assert saved.json()["prediction_available"] is True
    assert saved.json()["resident_category"] == "fallen_trees"
    assert saved.json()["verified_category"] is None
    assert saved.json()["model_category"] == preview.json()["model_category"]
    image_url = saved.json()["image_url"].removeprefix("/api")
    assert client.get(image_url).status_code == 200
    client.post("/auth/logout", headers={"X-CSRF-Token": client.cookies["csrf_token"]})
    assert client.get(image_url).status_code == 401
