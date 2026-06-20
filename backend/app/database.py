from supabase import create_client, Client
from .config import SUPABASE_URL, SUPABASE_KEY


def get_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def save_message(
    conversation_id: str,
    role: str,
    content: str,
    conversation_name: str = None,
    tool_calls=None,
    needs_attention: bool = False,
) -> dict:
    """Insert a message into Supabase and return the inserted row."""
    client = get_client()
    data = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "needs_attention": needs_attention,
        "read": False,
    }
    if conversation_name:
        data["conversation_name"] = conversation_name
    if tool_calls:
        data["tool_calls"] = tool_calls
    result = client.table("messages").insert(data).execute()
    return result.data[0] if result.data else {}


def get_conversation(conversation_id: str) -> list[dict]:
    """Get all messages for a conversation, ordered by created_at."""
    client = get_client()
    result = (
        client.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return result.data or []


def list_conversations() -> list[dict]:
    """Get a summary of all conversations for the admin inbox.
    Returns one row per conversation_id with latest message info."""
    client = get_client()
    # Get all messages ordered newest first so we can pick the latest per conversation
    result = (
        client.table("messages")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    rows = result.data or []

    seen = {}
    ordered = []
    for row in rows:
        cid = row["conversation_id"]
        if cid not in seen:
            seen[cid] = row
            ordered.append(cid)

    summaries = []
    for cid in ordered:
        latest = seen[cid]
        conv_rows = [r for r in rows if r["conversation_id"] == cid]
        has_unread = any(
            not r.get("read", True) and r["role"] != "visitor" for r in conv_rows
        )
        has_attention = any(r.get("needs_attention", False) for r in conv_rows)

        # Get conversation name from any row that has it
        conv_name = None
        for r in conv_rows:
            if r.get("conversation_name"):
                conv_name = r["conversation_name"]
                break

        # Get last visitor message for preview
        last_visitor = next(
            (r for r in reversed(conv_rows) if r["role"] == "visitor"), None
        )
        preview = (
            last_visitor["content"][:100]
            if last_visitor
            else (latest["content"][:100] if latest else "")
        )

        summaries.append(
            {
                "conversation_id": cid,
                "conversation_name": conv_name,
                "preview": preview,
                "last_at": latest["created_at"],
                "has_unread": has_unread,
                "has_attention": has_attention,
                "message_count": len(conv_rows),
            }
        )

    return summaries


def mark_conversation_read(conversation_id: str) -> list[dict]:
    """Mark all messages in a conversation as read and clear needs_attention.
    Returns the updated rows (single round-trip using PostgREST update...returning)."""
    client = get_client()
    result = (
        client.table("messages")
        .update({"read": True, "needs_attention": False})
        .eq("conversation_id", conversation_id)
        .execute()
    )
    return result.data or []


def delete_conversation(conversation_id: str):
    """Delete all messages in a conversation (for test cleanup)."""
    client = get_client()
    client.table("messages").delete().eq("conversation_id", conversation_id).execute()
