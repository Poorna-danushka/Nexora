from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import JWT_ALGORITHM, JWT_SECRET
from app.database.database import get_db
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = payload.get("sub")
        if not isinstance(user_id, str):
            raise unauthorized
        user = db.get(User, int(user_id))
    except (jwt.InvalidTokenError, ValueError):
        raise unauthorized

    if user is None:
        raise unauthorized
    return user
