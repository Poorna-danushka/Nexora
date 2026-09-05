from collections.abc import Callable
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from typing import TypeVar

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import AI_DAILY_REQUEST_LIMIT
from app.models.ai_usage import AIUsage
from app.models.user import User

T = TypeVar("T")
_provider_usage: ContextVar[dict[str, int] | None] = ContextVar(
    "provider_usage", default=None
)


class AIUsageLimitError(Exception):
    """Raised when a user has reached the configured rolling 24-hour limit."""


def set_provider_usage(usage: dict[str, int] | None) -> None:
    _provider_usage.set(usage)


def execute_with_ai_usage(
    db: Session,
    user_id: int,
    feature: str,
    operation: Callable[[], T],
) -> T:
    _provider_usage.set(None)
    # Lock the user's row while reserving a usage record so concurrent requests
    # for the same user cannot pass the limit check simultaneously.
    db.query(User).filter(User.id == user_id).with_for_update().one()
    window_start = datetime.now(timezone.utc) - timedelta(days=1)
    request_count = db.query(func.count(AIUsage.id)).filter(
        AIUsage.user_id == user_id,
        AIUsage.created_at >= window_start,
        AIUsage.success.is_(True),
    ).scalar()
    if request_count >= AI_DAILY_REQUEST_LIMIT:
        raise AIUsageLimitError("Rolling 24-hour AI request limit reached.")

    usage = AIUsage(user_id=user_id, feature=feature, success=False)
    db.add(usage)
    db.commit()
    try:
        result = operation()
    except Exception:
        usage.success = False
        db.commit()
        raise
    provider_usage = _provider_usage.get()
    if provider_usage:
        input_tokens = provider_usage.get("input_tokens")
        output_tokens = provider_usage.get("output_tokens")
        if (
            isinstance(input_tokens, int)
            and not isinstance(input_tokens, bool)
            and input_tokens >= 0
        ):
            usage.provider_input_tokens = input_tokens
        if (
            isinstance(output_tokens, int)
            and not isinstance(output_tokens, bool)
            and output_tokens >= 0
        ):
            usage.provider_output_tokens = output_tokens
    usage.success = True
    db.commit()
    return result
