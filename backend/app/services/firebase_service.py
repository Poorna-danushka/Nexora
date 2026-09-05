from app.core.config import (
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_PROJECT_ID,
)


class FirebaseConfigurationError(Exception):
    pass


def get_firebase_app():
    """Lazily initialize Firebase Admin for future notification sending."""
    if not all((FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)):
        raise FirebaseConfigurationError("Firebase Admin configuration is incomplete.")

    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError as exc:
        raise FirebaseConfigurationError("Firebase Admin SDK is not installed.") from exc

    try:
        return firebase_admin.get_app()
    except ValueError:
        credential = credentials.Certificate(
            {
                "type": "service_account",
                "project_id": FIREBASE_PROJECT_ID,
                "client_email": FIREBASE_CLIENT_EMAIL,
                "private_key": FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        )
        return firebase_admin.initialize_app(credential)


def send_message(message):
    app = get_firebase_app()
    try:
        from firebase_admin import messaging
    except ImportError as exc:
        raise FirebaseConfigurationError("Firebase Admin SDK is not installed.") from exc
    return messaging.send(message, app=app)
