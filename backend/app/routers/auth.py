from datetime import datetime, timedelta, timezone
from time import monotonic

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import (
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM,
    JWT_SECRET,
)
from app.core.security import verify_password
from app.database.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["authentication"])
_failed_logins: dict[str, list[float]] = {}
_MAX_FAILED_LOGINS = 5
_FAILED_LOGIN_WINDOW_SECONDS = 60


def _check_login_rate_limit(client_key: str) -> None:
    now = monotonic()
    recent_failures = [
        timestamp
        for timestamp in _failed_logins.get(client_key, [])
        if now - timestamp < _FAILED_LOGIN_WINDOW_SECONDS
    ]
    _failed_logins[client_key] = recent_failures
    if len(recent_failures) >= _MAX_FAILED_LOGINS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(_FAILED_LOGIN_WINDOW_SECONDS)},
        )


def _record_failed_login(client_key: str) -> None:
    _failed_logins.setdefault(client_key, []).append(monotonic())


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    client_key = request.client.host if request.client else "unknown"
    _check_login_rate_limit(client_key)
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if user is None or not verify_password(credentials.password, user.password_hash):
        _record_failed_login(client_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _failed_logins.pop(client_key, None)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    token = jwt.encode(
        {"sub": str(user.id), "exp": expires_at},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    return TokenResponse(access_token=token, expires_at=expires_at)
