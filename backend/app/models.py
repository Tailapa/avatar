from pydantic import BaseModel
from typing import Optional, Any


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    visitor_name: Optional[str] = None


class AdminLoginRequest(BaseModel):
    password: str


class AdminMessageRequest(BaseModel):
    content: str


class MessageRow(BaseModel):
    id: Optional[str] = None
    conversation_id: str
    conversation_name: Optional[str] = None
    role: str
    content: str
    tool_calls: Optional[Any] = None
    needs_attention: bool = False
    read: bool = False
    created_at: Optional[str] = None
