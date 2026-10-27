from conftest import register
from test_reports import submit
import hashlib

import pytest


def test_prediction_preview_requires_auth_and_falls_back_without_checkpoint(client, photo):
    files = {"image": ("incident.jpg", photo, "image/jpeg")}
    assert client.post("/reports/predict", files=files).status_code == 401
    register(client)
    response = client.post("/reports/predict", files=files,
                           headers={"X-CSRF-Token": client.cookies["csrf_token"]})
    assert response.status_code == 200
    assert response.json() == {"prediction_available": False, "model_category": None, "confidence": None,
                               "suggested_description": None}


def test_prediction_is_previewed_and_recomputed_for_saved_report(client, photo, monkeypatch):
    from barangai import inference

    register(client)
    calls = []

    def fake_predict(image):
        calls.append(image)
        return inference.Prediction("potholes", 0.91, [0.2, 0.4], "synthetic-v1")

    monkeypatch.setattr(inference, "predict", fake_predict)
    headers = {"X-CSRF-Token": client.cookies["csrf_token"]}
    preview = client.post("/reports/predict", files={"image": ("incident.jpg", photo, "image/jpeg")},
                          headers=headers)
    assert preview.json() == {"prediction_available": True, "model_category": "potholes", "confidence": 0.91,
                              "suggested_description": None}
    saved = submit(client, photo, resident_category="flooding").json()
    assert len(calls) == 2
    assert saved["resident_category"] == "flooding"
    assert saved["model_category"] == "potholes"
    assert saved["verified_category"] is None
    assert saved["prediction_available"] is True


def test_low_confidence_has_no_model_category_but_retains_embedding(client, photo, monkeypatch):
    from barangai import inference
    from barangai.db import session_for_url
    from barangai.models import Report

    register(client)
    monkeypatch.setattr(inference, "predict", lambda image: inference.Prediction(None, 0.44, [0.1, 0.3], "synthetic-v1"))
    saved = submit(client, photo).json()
    assert saved["model_category"] is None
    assert saved["prediction_available"] is True
    with session_for_url() as db:
        report = db.get(Report, saved["id"])
        assert report.image_embedding == [0.1, 0.3]
        assert report.embedding_model_version == "synthetic-v1"


def test_checkpoint_admission_rejects_wrong_digest_and_class_order(tmp_path, monkeypatch):
    from barangai import inference

    checkpoint = tmp_path / "model.pt"
    checkpoint.write_bytes(b"not a reviewed model")
    monkeypatch.setenv("MODEL_CHECKPOINT", str(checkpoint))
    monkeypatch.setenv("MODEL_CONFIDENCE_THRESHOLD", "0.8")
    monkeypatch.setenv("MODEL_APPROVED_SHA256", "0" * 64)
    with pytest.raises(ValueError, match="SHA-256"):
        inference.validate_configured_model()

    monkeypatch.setenv("MODEL_APPROVED_SHA256", hashlib.sha256(checkpoint.read_bytes()).hexdigest())
    with pytest.raises(ValueError, match="class order"):
        inference.validate_checkpoint_metadata({"categories": list(reversed(inference.CATEGORIES)),
                                                "architecture": "efficientnet_b0",
                                                "weights": "EfficientNet_B0_Weights.IMAGENET1K_V1"})


def test_unknown_preprocessing_is_rejected():
    from barangai import inference

    with pytest.raises(ValueError, match="preprocessing"):
        inference.validate_checkpoint_metadata({"categories": list(inference.CATEGORIES),
            "architecture": "efficientnet_b0", "weights": inference.WEIGHTS["efficientnet_b0"],
            "split_sha256": "a" * 64, "state_dict": {}, "preprocessing_version": "unknown"})


def test_runtime_failure_keeps_manual_photo_submission_working(client, photo, monkeypatch, caplog):
    from contextlib import nullcontext
    from types import SimpleNamespace
    from unittest.mock import Mock
    from barangai import inference

    register(client)
    broken_model = SimpleNamespace(features=Mock(side_effect=RuntimeError("inference failed")))
    torch = SimpleNamespace(inference_mode=nullcontext)
    transform = Mock(return_value=Mock())
    monkeypatch.setattr(inference, "model_settings", lambda: (None, "reviewed", .8))
    monkeypatch.setattr(inference, "load_runtime", lambda *args: (broken_model, transform, torch, .8, "demo-model"))
    headers = {"X-CSRF-Token": client.cookies["csrf_token"]}
    preview = client.post("/reports/predict", files={"image": ("incident.jpg", photo, "image/jpeg")}, headers=headers)
    assert preview.status_code == 200
    assert preview.json() == {"prediction_available": False, "model_category": None, "confidence": None,
                              "suggested_description": None}
    saved = submit(client, photo, resident_category="fallen_trees")
    assert saved.status_code == 201
    assert saved.json()["resident_category"] == "fallen_trees"
    assert saved.json()["model_category"] is None
    assert saved.json()["prediction_available"] is False
    assert client.get(saved.json()["image_url"].removeprefix("/api")).status_code == 200
    assert "demo-model" in caplog.text
