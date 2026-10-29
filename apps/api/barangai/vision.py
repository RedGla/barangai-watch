"""Photo-to-form filler: a Cloudflare Workers AI vision model reads the cleaned photo and returns the category,
a short description and hazard flags for the report form. The resident reviews and edits all of it.

Opt-in: needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_TOKEN (the chatbot's account). The free tier gives
10,000 neurons a day and never bills; when it runs out, or on any error, this returns None and the checker
(checker.py) or the resident fills the form instead.
"""

import base64
import json
import logging
import os
import re
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)
DEFAULT_MODEL = "@cf/google/gemma-3-12b-it"
CATEGORIES = (
    "flooding",
    "potholes",
    "fallen_trees",
    "uncollected_garbage",
    "damaged_signage",
    "broken_streetlights",
    "exposed_wiring",
    "other",
)
HAZARDS = ("electrical_hazard", "blocks_road", "risk_to_people")
LANGUAGES = {"en": "English", "fil": "Filipino", "taglish": "Taglish"}
UNSAFE_TEXT = re.compile(r"https?://|www\.|\b\+?\d[\d -]{6,}\d\b|@\w", re.I)


@dataclass(frozen=True)
class VisionResult:
    category: str | None  # None when the photo shows no barangay concern
    description: str | None
    hazards: tuple[str, ...]
    model: str


def configured():
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    token = os.environ.get("CLOUDFLARE_WORKERS_AI_TOKEN", "")
    if not re.fullmatch(r"[a-fA-F0-9]{32}", account) or not token:
        return None
    return account, token, os.environ.get("CLOUDFLARE_VISION_MODEL", DEFAULT_MODEL)


def instructions(language: str) -> str:
    return (
        "You help residents of a Philippine barangay report community problems from one photo. "
        f'Choose exactly one category from: {", ".join(CATEGORIES)}; use "none" if the photo shows no such problem. '
        f"Write a factual description in {LANGUAGES.get(language, 'English')}, one or two short sentences, about what is "
        "visible: the problem, its size and what it affects. Never identify or describe people's faces, names, plate "
        "numbers, addresses, phone numbers or other personal details, and do not guess the location. "
        f"List any hazards that clearly apply from: {', '.join(HAZARDS)}. "
        'Reply with JSON only: {"category": "...", "description": "...", "hazards": ["..."]}'
    )


def request_body(model: str, image: bytes, language: str) -> tuple[str, dict]:
    """Workers AI's OpenAI-compatible endpoint takes images as data URIs; Llama 3.2 Vision uses its own field."""
    encoded = base64.b64encode(image).decode()
    if "llama-3.2" in model:
        return f"ai/run/{model}", {
            "messages": [{"role": "user", "content": instructions(language)}],
            "image": encoded,
            "max_tokens": 220,
            "temperature": 0.2,
        }
    return "ai/v1/chat/completions", {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": instructions(language)},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}"}},
                ],
            }
        ],
        "max_tokens": 220,
        "temperature": 0.2,
    }


def reply_text(data) -> str | None:
    if not isinstance(data, dict):
        return None
    if isinstance(data.get("choices"), list) and data["choices"]:
        content = data["choices"][0].get("message", {}).get("content")
        return content if isinstance(content, str) else None
    result = data.get("result")
    if data.get("success") is True and isinstance(result, dict) and isinstance(result.get("response"), str):
        return result["response"]
    return None


def parse(text: str, model: str) -> VisionResult | None:
    """Accept only the agreed shape; anything else counts as no answer."""
    match = re.search(r"\{.*\}", text, re.S)
    try:
        data = json.loads(match.group(0)) if match else None
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    category = data.get("category")
    category = category.strip().lower() if isinstance(category, str) else None
    if category not in CATEGORIES:
        category = None
    description = data.get("description")
    description = " ".join(description.split())[:400] if isinstance(description, str) else None
    if not description or UNSAFE_TEXT.search(description):
        description = None
    raw_hazards = data.get("hazards") if isinstance(data.get("hazards"), list) else []
    hazards = tuple(h for h in HAZARDS if h in {str(item).strip().lower() for item in raw_hazards})
    if category is None and not description:
        return None
    return VisionResult(category, description, hazards, model)


def shrink(image: bytes, longest: int = 1024) -> bytes:
    """A smaller copy for the model: fewer image tokens means fewer neurons per report."""
    import io

    from PIL import Image

    with Image.open(io.BytesIO(image)) as picture:
        if max(picture.size) <= longest:
            return image
        picture.thumbnail((longest, longest), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        picture.convert("RGB").save(output, format="JPEG", quality=82)
        return output.getvalue()


def describe(sanitized_image: bytes, language: str = "en", model: str | None = None) -> VisionResult | None:
    settings = configured()
    if not settings:
        return None
    account, token, default_model = settings
    model = model or default_model
    path, body = request_body(model, shrink(sanitized_image), language)
    try:
        response = httpx.post(
            f"https://api.cloudflare.com/client/v4/accounts/{account}/{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
            timeout=float(os.environ.get("CLOUDFLARE_VISION_TIMEOUT", "20")),
        )
        if response.status_code != 200:
            log.warning("Vision model %s answered %s; the form falls back to the checker", model, response.status_code)
            return None
        text = reply_text(response.json())
    except (httpx.HTTPError, ValueError):
        log.warning("Vision model %s unavailable; the form falls back to the checker", model)
        return None
    return parse(text, model) if text else None
