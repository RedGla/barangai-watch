# Hybrid Chat Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans task by task. Steps use checkbox syntax.

**Goal:** Give residents localized reporting guidance through a no-billing LLM when configured, with deterministic, authorized status tracking and fallback.

**Architecture:** FastAPI owns report lookup and all access control. Only a locally derived generic topic and language reach Cloudflare Workers AI; raw messages and report data stay in the API. Missing credentials, timeouts, malformed output, and Free quota exhaustion return deterministic guidance.

**Tech Stack:** FastAPI, httpx, Cloudflare Workers AI Free REST endpoint.

**Spec:** `docs/superpowers/specs/2026-10-14-barangai-core-design.md`

## Global constraints

- Do not send resident personal data, photos, report IDs, status, coordinates, or raw message to an LLM.
- Report status is always from an ownership-checked database query.
- Use only a Free Cloudflare Workers AI account; no paid usage or automatic billing.
- No API key in source, docs examples, logs, or tests. No commit/push without direct user request.

## Review focus

- A message containing a phone number and address must not forward that text.
- A guessed other-resident report ID must return 404 without an LLM call.
- 429 quota, network timeout, or malformed response must return a clear deterministic answer.
- An LLM answer must never override the authoritative status.
- No configured account must still support all three language choices.

---

### Task 1: Curated guidance adapter

**Files:** `apps/api/barangai/fallbacks.py`, `apps/api/barangai/llm.py`, `apps/api/tests/test_chat.py`, `apps/api/pyproject.toml`, `.env.example`.

**Interfaces:** `guidance_topic(message: str) -> str` returns one of a fixed allowlist; `ask_guidance(topic: str, language: str) -> str | None` sends only the allowlisted topic and language to the configured Workers AI endpoint.

- [ ] Write failing tests for topic allowlist, PII isolation, three languages, quota/timeout fallback, and report lookup bypass of LLM.
- [ ] Run tests and confirm expected feature failures.
- [ ] Implement bounded REST call and response validation; preserve deterministic route for status.
- [ ] Run focused and full API tests.

### Task 2: Account-backed verification

**Files:** `docs/deployment.md`, `docs/evaluation.md`, deployed smoke evidence outside Git.

- [ ] Acquire user-authorized Cloudflare Free account ID and scoped Workers AI token.
- [ ] Confirm account has no paid billing path and record current daily allowance from [official pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- [ ] Exercise real English, Filipino, and Taglish prompts, verify privacy of outgoing payload and fallback at quota. Record actual results.
