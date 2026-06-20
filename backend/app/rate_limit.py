from limits import storage, strategies, parse
from fastapi import HTTPException

# Moving window: 20 requests per minute per conversation_id
memory_storage = storage.MemoryStorage()
limiter = strategies.MovingWindowRateLimiter(memory_storage)
rate_limit = parse("20/minute")


def check_rate_limit(conversation_id: str):
    """Raise HTTP 429 if this conversation_id has exceeded the rate limit."""
    key = f"chat:{conversation_id}"
    if not limiter.hit(rate_limit, key):
        raise HTTPException(
            status_code=429,
            detail="You're sending messages too quickly. Please wait a moment.",
        )
