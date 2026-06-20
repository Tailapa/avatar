# Backend Test Plan

Tests for the Avatar Digital Twin FastAPI backend.

Test file: `backend/tests/test_app.py`
Run with: `cd backend && uv run pytest tests/test_app.py -v`

---

## Auth Tests (`TestAuth`)

- [x] POST /admin/login with wrong password → 401
- [x] POST /admin/login with empty password → 401
- [x] POST /admin/login with correct password → 200, body contains `owner_name`
- [x] POST /admin/login sets httpOnly session cookie (`avatar_admin_session`)
- [x] POST /admin/logout clears the session cookie
- [x] GET /admin/api/check without session → `{authenticated: false}`
- [x] GET /admin/api/check with valid session → `{authenticated: true, owner_name: "..."}`
- [x] GET /admin/api/conversations without auth → 401
- [x] POST /admin/api/conversations/{id}/message without auth → 401
- [x] POST /admin/api/conversations/{id}/resolve without auth → 401
- [x] GET /admin/api/conversations/{id} without auth → 401

---

## Public Conversation Tests (`TestConversation`)

- [x] GET /api/conversation/{new_uuid} → 200, `{messages: []}`
- [x] GET /api/conversation/{id} after Qn chat → returns visitor + avatar messages

---

## Qn Instant-Answer Shortcut Tests (`TestQnShortcut`)

- [x] POST /api/chat with "Q1" → SSE stream contains `event: instant` and `event: done`
- [x] Instant event data includes `faq_num: 1`
- [x] Lowercase "q1" is recognised as a Qn shortcut
- [x] Two-digit FAQ "Q10" is handled instantly
- [x] Non-existent FAQ "Q99" still returns instant (not-found message, no LLM call)
- [x] Qn saves exactly two messages to DB (visitor + avatar)
- [x] Avatar reply text starts with `**Q1:` (restates the question in bold)

---

## Rate Limiting Tests (`TestRateLimit`)

- [x] 21 rapid-fire requests on same conversation_id → at least one returns 429
- [x] Two different conversation_ids are rate-limited independently (both first requests succeed)

---

## Message Truncation Tests (`TestMessageTruncation`)

- [x] Message > 20,000 chars is truncated in DB and contains "truncated" note
- [x] Message exactly 20,000 chars is stored unchanged
- [x] Message under 20,000 chars is stored verbatim

---

## Polling Tests (`TestPolling`)

- [x] GET /api/poll/{id} with no `after` param returns all messages
- [x] GET /api/poll/{id}?after=far-future returns empty list
- [x] GET /api/poll/{id} on empty conversation returns empty list

---

## Admin Workflow Tests (`TestAdminWorkflow`)

- [x] GET /admin/api/conversations with auth → 200, body contains `conversations` list
- [x] POST /admin/api/conversations/{id}/message → human message saved with role "human"
- [x] GET /admin/api/conversations/{id} via admin → returns full thread
- [x] GET /admin/api/conversations/{id} via admin → marks all messages `read: true`
- [x] POST /admin/api/conversations/{id}/resolve → `{status: "ok"}`
- [x] Human message posted from admin is visible via public GET /api/conversation/{id}
- [x] After a chat message, conversation_id appears in admin inbox list
- [x] Admin inbox summary rows contain required fields: `conversation_id`, `preview`, `last_at`, `has_unread`, `has_attention`, `message_count`

---

## Session Security Tests (`TestSessionSecurity`)

- [x] Tampered/forged session cookie → GET /admin/api/conversations returns 401
- [x] Tampered cookie → GET /admin/api/check returns `{authenticated: false}`
- [x] Login → confirm access → logout → access denied (full lifecycle)

---

## Truncation Unit Tests (`TestTruncateFunction`)

- [x] `truncate_message()` clips strings > 20,000 chars and appends "truncated" note
- [x] `truncate_message()` leaves short strings unchanged
- [x] `truncate_message()` leaves exactly-20,000-char strings unchanged

---

## Connectivity Tests (`test_supabase_connection.py`)

- [x] `SUPABASE_URL` and `SUPABASE_KEY` env vars are present and correctly formatted
- [x] `messages` table is reachable via Supabase Data API
- [x] Full insert / read / delete round-trip works and all expected columns are present

---

## Summary

| Suite | Tests | Status |
|-------|-------|--------|
| Auth | 11 | All pass |
| Conversation | 2 | All pass |
| Qn Shortcut | 7 | All pass |
| Rate Limiting | 2 | All pass |
| Truncation | 3 | All pass |
| Polling | 3 | All pass |
| Admin Workflow | 8 | All pass |
| Session Security | 3 | All pass |
| Truncation Unit | 3 | All pass |
| Supabase Connectivity | 3 | All pass |
| **Total** | **45** | **45 / 45 pass** |

Last run: 2026-06-19
Result: 42 passed (test_app.py) + 3 passed (test_supabase_connection.py) = **45 / 45**
