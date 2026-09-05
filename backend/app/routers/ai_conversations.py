from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.ai_conversation import AIConversation, AIMessage
from app.models.user import User
from app.schemas.ai_conversation import (
    AIConversationCreate,
    AIConversationResponse,
    AIConversationUpdate,
    AIMessageCreate,
    AIMessageResponse,
)
from app.services.ai import answer_conversation
from app.services.ai import AIConfigurationError as ServiceConfigurationError
from app.services.ai import AIInputError as ServiceInputError
from app.services.ai import AIProviderError as ServiceProviderError
from app.services.ai_usage import AIUsageLimitError, execute_with_ai_usage

router = APIRouter(prefix="/ai/conversations", tags=["ai conversations"])


def owned_conversation(conversation_id: int, user: User, db: Session) -> AIConversation:
    conversation = db.query(AIConversation).filter(
        AIConversation.id == conversation_id,
        AIConversation.user_id == user.id,
    ).first()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conversation


@router.post("", response_model=AIConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    data: AIConversationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = AIConversation(user_id=user.id, title=data.title)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("", response_model=list[AIConversationResponse])
def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(AIConversation).filter(
        AIConversation.user_id == user.id
    ).order_by(AIConversation.updated_at.desc()).all()


@router.get("/{conversation_id}", response_model=AIConversationResponse)
def get_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return owned_conversation(conversation_id, user, db)


@router.patch("/{conversation_id}", response_model=AIConversationResponse)
def update_conversation(
    conversation_id: int,
    data: AIConversationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = owned_conversation(conversation_id, user, db)
    conversation.title = data.title
    db.commit()
    db.refresh(conversation)
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = owned_conversation(conversation_id, user, db)
    db.delete(conversation)
    db.commit()


@router.get("/{conversation_id}/messages", response_model=list[AIMessageResponse])
def list_messages(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_conversation(conversation_id, user, db)
    return db.query(AIMessage).filter(
        AIMessage.conversation_id == conversation_id
    ).order_by(AIMessage.created_at, AIMessage.id).all()


@router.post("/{conversation_id}/messages", response_model=list[AIMessageResponse])
def send_message(
    conversation_id: int,
    data: AIMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = owned_conversation(conversation_id, user, db)
    existing = db.query(AIMessage).filter(
        AIMessage.conversation_id == conversation_id
    ).order_by(AIMessage.created_at, AIMessage.id).all()
    prompt_messages = [{"role": message.role, "content": message.content} for message in existing]
    prompt_messages.append({"role": "user", "content": data.content})
    try:
        answer = execute_with_ai_usage(
            db,
            user.id,
            "ai_chat",
            lambda: answer_conversation(prompt_messages),
        )
    except AIUsageLimitError as exc:
        raise HTTPException(status_code=429, detail="Rolling 24-hour AI request limit reached.") from exc
    except ServiceInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ServiceConfigurationError as exc:
        raise HTTPException(status_code=503, detail="AI chat is not configured.") from exc
    except ServiceProviderError as exc:
        raise HTTPException(status_code=502, detail="Unable to respond right now.") from exc

    db.add(AIMessage(conversation_id=conversation.id, role="user", content=data.content))
    db.add(AIMessage(conversation_id=conversation.id, role="assistant", content=answer))
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()
    return db.query(AIMessage).filter(
        AIMessage.conversation_id == conversation_id
    ).order_by(AIMessage.created_at, AIMessage.id).all()


@router.delete("/{conversation_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    conversation_id: int,
    message_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_conversation(conversation_id, user, db)
    message = db.query(AIMessage).filter(
        AIMessage.id == message_id,
        AIMessage.conversation_id == conversation_id,
    ).first()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    db.delete(message)
    db.commit()
