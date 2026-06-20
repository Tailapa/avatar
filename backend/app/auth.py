from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Request, HTTPException
from .config import SESSION_SECRET, ADMIN_PASSWORD

signer = URLSafeTimedSerializer(SESSION_SECRET)
SESSION_COOKIE = "avatar_admin_session"


def create_session_token() -> str:
    return signer.dumps({"admin": True})


def verify_session(request: Request) -> bool:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return False
    try:
        data = signer.loads(token, max_age=86400 * 7)  # 7 days
        return data.get("admin") is True
    except (BadSignature, SignatureExpired):
        return False


def require_admin(request: Request):
    if not verify_session(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
