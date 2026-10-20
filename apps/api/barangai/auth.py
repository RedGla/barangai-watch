import hashlib
import os
import secrets
import time
from collections import defaultdict, deque
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import LoginSession, User, now

router = APIRouter(prefix="/auth")
hasher = PasswordHasher()
attempts = defaultdict(deque)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=12, max_length=128)


class LoginCredentials(BaseModel):
    email: str
    password: str


def user_data(user):
    return {"id": user.id, "email": user.email, "role": user.role}


def rate_limit(request, action, count=10):
    key = (action, request.client.host if request.client else "unknown")
    bucket = attempts[key]
    current = time.monotonic()
    while bucket and bucket[0] < current - 60:
        bucket.popleft()
    if len(bucket) >= count:
        raise HTTPException(429, "Too many requests")
    bucket.append(current)


def create_session(response, db, user):
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    db.add(LoginSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id,
                        csrf_token=csrf, expires_at=now() + timedelta(days=7)))
    db.commit()
    secure = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
    response.set_cookie("session", token, httponly=True, secure=secure, samesite="lax", max_age=604800)
    response.set_cookie("csrf_token", csrf, httponly=False, secure=secure, samesite="lax", max_age=604800)


def current_session(request: Request, db: Session):
    token = request.cookies.get("session")
    if not token:
        raise HTTPException(401, "Authentication required")
    session = db.get(LoginSession, hashlib.sha256(token.encode()).hexdigest())
    if not session or session.expires_at.replace(tzinfo=None) < now().replace(tzinfo=None):
        raise HTTPException(401, "Authentication required")
    return session


def get_current_user(request: Request, db: Session = Depends(get_db)):
    return current_session(request, db).user


def require_role(user: User, roles):
    if user.role not in roles:
        raise HTTPException(403, "Insufficient role")


def require_csrf(request: Request, db: Session = Depends(get_db)):
    session = current_session(request, db)
    supplied = request.headers.get("X-CSRF-Token", "")
    if not supplied or not secrets.compare_digest(supplied, session.csrf_token) or not secrets.compare_digest(request.cookies.get("csrf_token", ""), supplied):
        raise HTTPException(403, "Invalid CSRF token")
    return session.user


@router.post("/register", status_code=201)
def register(credentials: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    rate_limit(request, "register")
    email = credentials.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    user = User(email=email, password_hash=hasher.hash(credentials.password), role="resident")
    db.add(user)
    db.commit()
    db.refresh(user)
    create_session(response, db, user)
    return user_data(user)


@router.post("/login")
def login(credentials: LoginCredentials, request: Request, response: Response, db: Session = Depends(get_db)):
    rate_limit(request, "login")
    user = db.scalar(select(User).where(User.email == credentials.email.lower()))
    try:
        valid = bool(user and hasher.verify(user.password_hash, credentials.password))
    except VerifyMismatchError:
        valid = False
    if not valid:
        raise HTTPException(401, "Invalid credentials")
    create_session(response, db, user)
    return user_data(user)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_data(user)


@router.post("/logout", status_code=204)
def logout(response: Response, request: Request, db: Session = Depends(get_db), user: User = Depends(require_csrf)):
    token = request.cookies.get("session")
    db.delete(db.get(LoginSession, hashlib.sha256(token.encode()).hexdigest()))
    db.commit()
    response.delete_cookie("session")
    response.delete_cookie("csrf_token")
