import json
import re

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from ..database import save_message, get_conversation
from ..rate_limit import check_rate_limit
from ..agent import run_agent_streaming, get_faq_answer
from ..models import ChatRequest
from ..config import OWNER_NAME

router = APIRouter()


@router.get("/api/config")
async def get_config():
    """Return public configuration (owner name) for the frontend."""
    return {"owner_name": OWNER_NAME}

MAX_MESSAGE_LENGTH = 20_000
TRUNCATION_NOTE = (
    " [...message truncated as it's too long; ask the visitor to send something more concise]"
)


def truncate_message(content: str) -> str:
    if len(content) > MAX_MESSAGE_LENGTH:
        return content[:MAX_MESSAGE_LENGTH] + TRUNCATION_NOTE
    return content


@router.get("/api/conversation/{conversation_id}")
async def get_conversation_route(conversation_id: str):
    """Get all messages for a conversation."""
    messages = get_conversation(conversation_id)
    return {"messages": messages}


@router.post("/api/chat")
async def chat(request: ChatRequest):
    """Send a message and get a streaming SSE response from the avatar."""
    # Rate limiting
    check_rate_limit(request.conversation_id)

    # Truncate if necessary
    content = truncate_message(request.message)

    # Check for Qn instant-answer shortcut (e.g. "Q2", "q12")
    qn_match = re.match(r"^q(\d{1,2})$", content.strip(), re.IGNORECASE)

    # Save visitor message first
    save_message(
        conversation_id=request.conversation_id,
        role="visitor",
        content=content,
        conversation_name=request.visitor_name,
    )

    if qn_match:
        # Instant FAQ answer — no LLM call
        faq_num = int(qn_match.group(1))
        faq = get_faq_answer(faq_num)
        if faq:
            answer = f"**Q{faq_num}: {faq['question']}**\n\n{faq['answer']}"
        else:
            answer = f"FAQ #{faq_num} not found."

        save_message(
            conversation_id=request.conversation_id,
            role="avatar",
            content=answer,
            conversation_name=request.visitor_name,
        )

        async def instant_stream():
            yield (
                f"event: instant\ndata: "
                f"{json.dumps({'faq_num': faq_num, 'text': answer})}\n\n"
            )
            yield (
                f"event: done\ndata: "
                f"{json.dumps({'full_text': answer, 'instant': True, 'faq_num': faq_num})}\n\n"
            )

        return StreamingResponse(
            instant_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # Get conversation history for the agent (everything already in DB, excluding
    # the message we just inserted to avoid duplicating it in the prompt)
    history = get_conversation(request.conversation_id)
    # Remove the last visitor message we just saved so we pass it separately
    history_without_last = history[:-1] if history and history[-1]["role"] == "visitor" else history

    async def event_stream():
        full_text = ""
        tool_calls: list[dict] = []
        needs_attention = False

        async for event in run_agent_streaming(
            history_without_last, content, request.visitor_name
        ):
            etype = event["type"]

            if etype == "token":
                full_text += event["text"]
                yield f"event: token\ndata: {json.dumps({'text': event['text']})}\n\n"

            elif etype == "tool_start":
                yield (
                    f"event: tool_start\ndata: "
                    f"{json.dumps({'tool': event['tool'], 'message': event['message']})}\n\n"
                )

            elif etype == "tool_done":
                tool_calls.append({"name": event["tool"]})
                if event["tool"] == "push_tool":
                    needs_attention = True
                yield (
                    f"event: tool_done\ndata: "
                    f"{json.dumps({'tool': event['tool'], 'message': event['message']})}\n\n"
                )

            elif etype == "done":
                full_text = event.get("full_text", full_text)
                tool_calls = event.get("tool_calls", tool_calls)
                save_message(
                    conversation_id=request.conversation_id,
                    role="avatar",
                    content=full_text,
                    conversation_name=request.visitor_name,
                    tool_calls=tool_calls if tool_calls else None,
                    needs_attention=needs_attention,
                )
                yield f"event: done\ndata: {json.dumps({'full_text': full_text})}\n\n"

            elif etype == "error":
                yield (
                    f"event: error\ndata: "
                    f"{json.dumps({'message': event['message']})}\n\n"
                )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/api/poll/{conversation_id}")
async def poll_conversation(conversation_id: str, after: str = None):
    """Poll for new messages since a given timestamp (for human messages from admin)."""
    messages = get_conversation(conversation_id)

    if after:
        new_messages = [m for m in messages if m.get("created_at", "") > after]
    else:
        new_messages = messages

    return {"messages": new_messages}
