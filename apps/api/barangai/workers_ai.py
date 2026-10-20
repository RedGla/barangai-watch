import os
import re

import httpx

MODEL = "@cf/aisingapore/gemma-sea-lion-v4-27b-it"
LANGUAGES = {"en": "English", "fil": "Filipino", "taglish": "Taglish"}
TOPICS = (
    ("flooding", ("flood", "baha")),
    ("potholes", ("pothole", "lubak")),
    ("fallen trees", ("fallen tree", "natumbang puno")),
    ("uncollected garbage", ("garbage", "basura", "trash")),
    ("damaged signage", ("signage", "damaged sign", "karatula")),
)


def guidance_topic(message: str) -> str:
    lower = message.casefold()
    for topic, terms in TOPICS:
        if any(term in lower for term in terms):
            return topic
    return "barangay concern reporting"


def workers_ai_guidance(message: str, language: str) -> str | None:
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    token = os.environ.get("CLOUDFLARE_WORKERS_AI_TOKEN", "")
    if not re.fullmatch(r"[a-fA-F0-9]{32}", account) or not token:
        return None
    topic = guidance_topic(message)
    prompt = (f"Give brief, general {LANGUAGES[language]} safety and reporting guidance about {topic}. "
              "Do not state any specific report status, local contact details, addresses, or phone numbers.")
    try:
        response = httpx.post(
            f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{MODEL}",
            headers={"Authorization": f"Bearer {token}"},
            json={"messages": [
                {"role": "system", "content": "You give cautious general guidance for a Philippine barangay. Keep it concise and do not invent case details."},
                {"role": "user", "content": prompt},
            ], "max_tokens": 160, "temperature": 0.3},
            timeout=8.0,
        )
        if response.status_code != 200:
            return None
        data = response.json()
    except (httpx.HTTPError, ValueError):
        return None
    if not isinstance(data, dict) or data.get("success") is not True or not isinstance(data.get("result"), dict):
        return None
    answer = data["result"].get("response")
    if not isinstance(answer, str):
        return None
    answer = answer.strip()
    if not answer or len(answer) > 800 or re.search(r"https?://|www\.|\b\+?\d[\d -]{6,}\d\b", answer, re.I):
        return None
    return answer
