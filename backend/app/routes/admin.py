from fastapi import APIRouter, Request, Response, HTTPException

from ..database import list_conversations, get_conversation, save_message, mark_conversation_read
from ..auth import require_admin, create_session_token, SESSION_COOKIE, verify_session
from ..models import AdminLoginRequest, AdminMessageRequest
from ..config import ADMIN_PASSWORD, COOKIE_SECURE, OWNER_NAME

router = APIRouter()


@router.post("/admin/login")
async def admin_login(request: AdminLoginRequest, response: Response):
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

    token = create_session_token()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=86400 * 7,  # 7 days
    )
    return {"status": "ok", "owner_name": OWNER_NAME}


@router.post("/admin/logout")
async def admin_logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"status": "ok"}


@router.get("/admin/api/check")
async def check_auth(request: Request):
    """Check if the current session is authenticated."""
    if verify_session(request):
        return {"authenticated": True, "owner_name": OWNER_NAME}
    return {"authenticated": False}


@router.get("/admin/api/conversations")
async def list_convos(request: Request):
    require_admin(request)
    conversations = list_conversations()
    return {"conversations": conversations}


@router.get("/admin/api/conversations/{conversation_id}")
async def get_convo(conversation_id: str, request: Request):
    require_admin(request)
    # Mark as read and return updated messages (single round-trip)
    mark_conversation_read(conversation_id)
    messages = get_conversation(conversation_id)
    return {"messages": messages}


@router.post("/admin/api/conversations/{conversation_id}/message")
async def post_human_message(
    conversation_id: str, body: AdminMessageRequest, request: Request
):
    require_admin(request)
    msg = save_message(
        conversation_id=conversation_id,
        role="human",
        content=body.content,
    )
    return {"message": msg}


@router.post("/admin/api/conversations/{conversation_id}/resolve")
async def resolve_conversation(conversation_id: str, request: Request):
    require_admin(request)
    mark_conversation_read(conversation_id)
    return {"status": "ok"}
