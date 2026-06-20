import os
import json
import requests
from typing import AsyncIterator

from agents import (
    Agent,
    Runner,
    RunConfig,
    OpenAIProvider,
    ModelSettings,
    function_tool,
)
from openai import AsyncOpenAI

from .config import OPENROUTER_API_KEY, MODEL, OWNER_NAME, PUSHOVER_USER, PUSHOVER_TOKEN

# ---------------------------------------------------------------------------
# OpenRouter client + RunConfig (idiomatic OpenAI Agents SDK approach)
# ---------------------------------------------------------------------------
_openrouter_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

def _make_run_config() -> RunConfig:
    """Build a RunConfig that routes through OpenRouter with a sensible token budget."""
    return RunConfig(
        model_provider=OpenAIProvider(openai_client=_openrouter_client, use_responses=False),
        model_settings=ModelSettings(max_tokens=4096),
        tracing_disabled=True,
    )

# ---------------------------------------------------------------------------
# Knowledge loading
# ---------------------------------------------------------------------------
_knowledge_dir = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge")


def _load_knowledge():
    with open(os.path.join(_knowledge_dir, "knowledge.md"), "r", encoding="utf-8") as f:
        knowledge = f.read()
    with open(os.path.join(_knowledge_dir, "style.md"), "r", encoding="utf-8") as f:
        style = f.read()
    faqs = []
    with open(os.path.join(_knowledge_dir, "faq.jsonl"), "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                faqs.append(json.loads(line))
    return knowledge, style, faqs


KNOWLEDGE, STYLE, FAQS = _load_knowledge()

# Build FAQ lookup index keyed by faq number (int)
FAQ_INDEX: dict[int, dict] = {faq["faq"]: faq for faq in FAQS}
FAQ_ROUTING = "\n".join(f"  Q{faq['faq']}: {faq['query']}" for faq in FAQS)


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

def build_system_prompt() -> str:
    return f"""# Your role

You are {OWNER_NAME}'s digital twin — an AI avatar running on their personal website. Visitors come here to learn about {OWNER_NAME}. You represent them authentically and engagingly.

This is a multi-party conversation: you (the Avatar), the visitor, and sometimes {OWNER_NAME} themselves (the "human") may join and post directly. When {OWNER_NAME} posts, their message appears in the thread. You do NOT respond to {OWNER_NAME}'s messages directly — only to the visitor's latest message.

# About {OWNER_NAME}

{KNOWLEDGE}

# Voice and style

{STYLE}

# FAQ routing

When a visitor's question matches one of these topics, use the faq_tool to look up the full answer:

{FAQ_ROUTING}

# Rules

1. Always be in character as {OWNER_NAME}'s digital twin. Refer to yourself as "{OWNER_NAME}'s digital twin" or "the Avatar."
2. Answer questions about {OWNER_NAME}'s career, background, projects, skills, and views.
3. If a visitor wants to get in touch or you can't answer something, ask for their email and use push_tool to notify {OWNER_NAME}.
4. NEVER fabricate answers. If you don't know, say so and use push_tool to flag it.
5. Use markdown formatting (no code blocks unless showing actual code).
6. Keep responses concise and direct.
"""


# ---------------------------------------------------------------------------
# FAQ helper (used by instant Qn shortcut in chat route)
# ---------------------------------------------------------------------------

def get_faq_answer(faq_number: int) -> dict | None:
    """Return the full FAQ entry for a given number, or None."""
    return FAQ_INDEX.get(faq_number)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@function_tool
def faq_tool(query: str) -> str:
    """
    Look up information from the FAQ knowledge base.

    Args:
        query: A question or topic to look up
    """
    query_lower = query.lower()
    query_words = [w for w in query_lower.split() if len(w) > 2]

    best_match = None
    best_score = 0

    for faq in FAQS:
        combined = (faq["query"] + " " + faq["question"] + " " + faq["answer"]).lower()
        score = sum(1 for word in query_words if word in combined)
        if score > best_score:
            best_score = score
            best_match = faq

    if best_match and best_score > 0:
        return f"**Q: {best_match['question']}**\n\n{best_match['answer']}"

    return f"No specific FAQ entry found for: {query}. Use your knowledge of {OWNER_NAME} to answer."


@function_tool
def push_tool(message: str) -> str:
    """
    Send a push notification to the human owner about something that needs their attention.
    Use this when: a visitor wants to get in touch, you can't answer a question,
    or a visitor shares contact info.

    Args:
        message: The message to send to the owner
    """
    if not PUSHOVER_USER or not PUSHOVER_TOKEN:
        return "Push notification skipped (Pushover not configured)."

    try:
        payload = {
            "user": PUSHOVER_USER,
            "token": PUSHOVER_TOKEN,
            "message": message,
            "title": f"Avatar: Visitor needs attention",
        }
        result = requests.post(
            "https://api.pushover.net/1/messages.json", data=payload, timeout=5
        )
        return f"Message pushed to {OWNER_NAME} (status: {result.status_code})."
    except Exception as e:
        return f"Push notification failed: {str(e)}"


# ---------------------------------------------------------------------------
# Agent factory
# ---------------------------------------------------------------------------

def build_agent() -> Agent:
    return Agent(
        name=f"{OWNER_NAME}'s Avatar",
        instructions=build_system_prompt(),
        tools=[faq_tool, push_tool],
        model=MODEL,
    )


# ---------------------------------------------------------------------------
# Streaming runner
# ---------------------------------------------------------------------------

async def run_agent_streaming(
    conversation_history: list[dict],
    new_message: str,
    visitor_name: str = None,
) -> AsyncIterator[dict]:
    """
    Run the agent and yield SSE-ready event dicts:
      {"type": "tool_start", "tool": "<name>", "message": "..."}
      {"type": "tool_done",  "tool": "<name>", "message": "..."}
      {"type": "token",      "text": "..."}
      {"type": "done",       "full_text": "...", "tool_calls": [...]}
      {"type": "error",      "message": "..."}

    Uses Runner.run() (non-streaming) instead of Runner.run_streamed() to avoid
    the tool_call_id sequencing bug that occurs when streaming + use_responses=False
    on OpenRouter: the streaming path sends the follow-up request after a tool call
    without the required tool-result messages, causing a 400 from the API.
    The final text is yielded in small chunks to preserve the streaming UX.
    """
    agent = build_agent()

    # Build the single task prompt: full conversation + new visitor message
    task_parts = []
    for msg in conversation_history:
        role_label = {
            "visitor": f"Visitor ({visitor_name or 'Visitor'})",
            "avatar": "You (Avatar)",
            "human": f"{OWNER_NAME} (the human, live)",
        }.get(msg["role"], msg["role"])
        task_parts.append(f"**{role_label}:** {msg['content']}")

    task_parts.append(f"**Visitor ({visitor_name or 'Visitor'}):** {new_message}")
    task = "\n\n".join(task_parts)
    task += f"\n\nRespond as {OWNER_NAME}'s Avatar to the latest visitor message above."

    tool_calls: list[dict] = []

    try:
        run_config = _make_run_config()

        # Non-streaming run — correctly handles multi-turn tool calls
        result = await Runner.run(agent, task, run_config=run_config)

        # Reconstruct tool_start / tool_done events from result.new_items.
        # ToolCallItem:       raw_item has .name (str) + .arguments (str)
        # ToolCallOutputItem: has .output (str) attribute
        pending_tool: str | None = None
        for item in result.new_items:
            raw = getattr(item, "raw_item", None)
            # Detect a tool-call item by its raw_item having .name and .arguments
            if (
                raw is not None
                and isinstance(getattr(raw, "name", None), str)
                and hasattr(raw, "arguments")
            ):
                pending_tool = raw.name
                tool_calls.append({"name": pending_tool, "status": "calling"})
                yield {
                    "type": "tool_start",
                    "tool": pending_tool,
                    "message": f"Looking up {pending_tool}...",
                }
            # Detect a tool-output item by its .output attribute (string)
            elif isinstance(getattr(item, "output", None), str) and pending_tool:
                tool_calls[-1]["status"] = "done"
                yield {
                    "type": "tool_done",
                    "tool": pending_tool,
                    "message": f"{pending_tool} · done",
                }
                pending_tool = None

        # Stream the final text in chunks so the client sees incremental output
        full_text = result.final_output or ""
        CHUNK = 6
        for i in range(0, len(full_text), CHUNK):
            yield {"type": "token", "text": full_text[i : i + CHUNK]}

        yield {"type": "done", "full_text": full_text, "tool_calls": tool_calls}

    except Exception as e:
        yield {"type": "error", "message": str(e)}
