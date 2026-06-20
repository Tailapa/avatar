"""
Comprehensive pytest tests for the Avatar Digital Twin backend.

Tests cover:
- Auth: login, logout, session management
- Public API: conversation fetch, polling, Qn instant shortcut
- Rate limiting
- Message truncation
- Admin workflow: CRUD operations on conversations
- Security: unauthenticated admin access is blocked
"""

import json
import uuid
import time

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import ADMIN_PASSWORD, OWNER_NAME
from app.database import delete_conversation

# ---------------------------------------------------------------------------
# Client setup
# ---------------------------------------------------------------------------

# raise_server_exceptions=False lets us inspect 4xx/5xx without pytest blowing up
client = TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def cid():
    """Generate a unique conversation_id and clean it up after the test."""
    conversation_id = str(uuid.uuid4())
    yield conversation_id
    delete_conversation(conversation_id)


@pytest.fixture()
def admin_client():
    """Return a TestClient that has an active admin session cookie."""
    resp = client.post("/admin/login", json={"password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login fixture failed: {resp.text}"
    # TestClient stores cookies between requests on the same instance when
    # follow_redirects is enabled; we use the shared `client` and just return it.
    return client


@pytest.fixture()
def authed_cid(admin_client):
    """Give tests an authenticated client AND a clean conversation_id."""
    conversation_id = str(uuid.uuid4())
    yield admin_client, conversation_id
    delete_conversation(conversation_id)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def login_admin():
    """Log in as admin and return the cookie jar for reuse."""
    resp = client.post("/admin/login", json={"password": ADMIN_PASSWORD})
    assert resp.status_code == 200
    return resp.cookies


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------

class TestAuth:
    def test_login_wrong_password_returns_401(self):
        resp = client.post("/admin/login", json={"password": "definitely-wrong"})
        assert resp.status_code == 401

    def test_login_empty_password_returns_401(self):
        resp = client.post("/admin/login", json={"password": ""})
        assert resp.status_code == 401

    def test_login_correct_returns_200_with_owner_name(self):
        resp = client.post("/admin/login", json={"password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["owner_name"] == OWNER_NAME

    def test_login_sets_httponly_cookie(self):
        resp = client.post("/admin/login", json={"password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        # httpx/TestClient exposes set-cookie headers
        set_cookie = resp.headers.get("set-cookie", "")
        assert "avatar_admin_session" in set_cookie
        assert "httponly" in set_cookie.lower()

    def test_logout_clears_cookie(self, admin_client):
        resp = admin_client.post("/admin/logout")
        assert resp.status_code == 200
        set_cookie = resp.headers.get("set-cookie", "")
        # After logout the cookie should either be deleted or max-age=0
        assert "avatar_admin_session" in set_cookie

    def test_check_auth_without_session_returns_false(self):
        # Fresh client with no cookies
        fresh = TestClient(app, raise_server_exceptions=False)
        resp = fresh.get("/admin/api/check")
        assert resp.status_code == 200
        assert resp.json()["authenticated"] is False

    def test_check_auth_with_valid_session_returns_true(self, admin_client):
        resp = admin_client.get("/admin/api/check")
        assert resp.status_code == 200
        body = resp.json()
        assert body["authenticated"] is True
        assert body["owner_name"] == OWNER_NAME

    def test_conversations_without_auth_returns_401(self):
        fresh = TestClient(app, raise_server_exceptions=False)
        resp = fresh.get("/admin/api/conversations")
        assert resp.status_code == 401

    def test_post_human_message_without_auth_returns_401(self):
        fresh = TestClient(app, raise_server_exceptions=False)
        conversation_id = str(uuid.uuid4())
        resp = fresh.post(
            f"/admin/api/conversations/{conversation_id}/message",
            json={"content": "sneaky"},
        )
        assert resp.status_code == 401

    def test_resolve_without_auth_returns_401(self):
        fresh = TestClient(app, raise_server_exceptions=False)
        conversation_id = str(uuid.uuid4())
        resp = fresh.post(
            f"/admin/api/conversations/{conversation_id}/resolve"
        )
        assert resp.status_code == 401

    def test_get_thread_without_auth_returns_401(self):
        fresh = TestClient(app, raise_server_exceptions=False)
        conversation_id = str(uuid.uuid4())
        resp = fresh.get(f"/admin/api/conversations/{conversation_id}")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Public chat / conversation tests
# ---------------------------------------------------------------------------

class TestConversation:
    def test_get_new_conversation_returns_empty_list(self, cid):
        resp = client.get(f"/api/conversation/{cid}")
        assert resp.status_code == 200
        body = resp.json()
        assert "messages" in body
        assert body["messages"] == []

    def test_get_conversation_returns_messages_after_chat(self, cid):
        """After a Qn shortcut chat, messages should appear in the conversation."""
        # Post a Qn message (no LLM needed)
        chat_resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q1", "visitor_name": "Tester"},
        )
        assert chat_resp.status_code == 200

        # Fetch the conversation
        get_resp = client.get(f"/api/conversation/{cid}")
        assert get_resp.status_code == 200
        messages = get_resp.json()["messages"]
        assert len(messages) >= 2  # visitor + avatar

        roles = [m["role"] for m in messages]
        assert "visitor" in roles
        assert "avatar" in roles


# ---------------------------------------------------------------------------
# Qn instant-answer shortcut tests
# ---------------------------------------------------------------------------

class TestQnShortcut:
    def test_q1_returns_instant_sse_events(self, cid):
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q1", "visitor_name": "Tester"},
        )
        assert resp.status_code == 200
        body = resp.text

        # SSE stream should contain 'instant' and 'done' events
        assert "event: instant" in body
        assert "event: done" in body

    def test_q1_response_contains_question_and_answer(self, cid):
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q1", "visitor_name": "Tester"},
        )
        body = resp.text
        # The instant event data should have faq_num=1
        assert '"faq_num": 1' in body or '"faq_num":1' in body

    def test_q_lowercase_works(self, cid):
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "q1", "visitor_name": "Tester"},
        )
        assert resp.status_code == 200
        assert "event: instant" in resp.text

    def test_q_with_two_digit_faq(self, cid):
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q10", "visitor_name": "Tester"},
        )
        assert resp.status_code == 200
        assert "event: instant" in resp.text

    def test_q_nonexistent_faq_still_instant(self, cid):
        """Q99 doesn't exist but is still handled instantly (no LLM) with a not-found msg."""
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q99", "visitor_name": "Tester"},
        )
        assert resp.status_code == 200
        assert "event: instant" in resp.text
        assert "not found" in resp.text.lower()

    def test_qn_shortcut_saves_both_messages(self, cid):
        """Qn saves visitor + avatar messages to the DB."""
        client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q2", "visitor_name": "Tester"},
        )
        msgs = client.get(f"/api/conversation/{cid}").json()["messages"]
        assert len(msgs) == 2
        assert msgs[0]["role"] == "visitor"
        assert msgs[1]["role"] == "avatar"

    def test_qn_instant_event_contains_bold_question(self, cid):
        """The avatar reply should restate the question in bold before the answer."""
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q1", "visitor_name": "Tester"},
        )
        body = resp.text
        # Parse the JSON payload from the 'instant' event line
        for line in body.splitlines():
            if line.startswith("data:") and "instant" not in line:
                # Try to find the text in the done event
                pass
        # The answer text should contain **Q1:
        assert "**Q1:" in body


# ---------------------------------------------------------------------------
# Rate limiting tests
# ---------------------------------------------------------------------------

class TestRateLimit:
    def test_rate_limit_triggers_429_after_20_messages(self):
        """Hitting the same conversation_id 21 times must yield at least one 429."""
        cid = str(uuid.uuid4())
        responses = []
        try:
            for _ in range(21):
                resp = client.post(
                    "/api/chat",
                    json={"conversation_id": cid, "message": "Q1"},
                )
                responses.append(resp.status_code)
        finally:
            delete_conversation(cid)

        assert 429 in responses, f"Expected a 429 among responses: {responses}"

    def test_different_conversation_ids_are_independent(self):
        """Two different conversation_ids should each have their own rate-limit bucket."""
        cid_a = str(uuid.uuid4())
        cid_b = str(uuid.uuid4())
        try:
            # First request on each cid should succeed (200)
            r1 = client.post("/api/chat", json={"conversation_id": cid_a, "message": "Q1"})
            r2 = client.post("/api/chat", json={"conversation_id": cid_b, "message": "Q1"})
            assert r1.status_code == 200
            assert r2.status_code == 200
        finally:
            delete_conversation(cid_a)
            delete_conversation(cid_b)


# ---------------------------------------------------------------------------
# Message truncation tests
# ---------------------------------------------------------------------------

class TestMessageTruncation:
    def test_message_over_20000_chars_is_truncated_in_db(self, cid):
        """A message longer than 20,000 chars should be stored truncated."""
        long_msg = "A" * 25_000
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": long_msg, "visitor_name": "Tester"},
        )
        assert resp.status_code == 200

        # Fetch back and inspect the visitor message
        msgs = client.get(f"/api/conversation/{cid}").json()["messages"]
        visitor_msgs = [m for m in msgs if m["role"] == "visitor"]
        assert visitor_msgs, "No visitor message found"
        stored = visitor_msgs[0]["content"]
        # Must be shorter than original
        assert len(stored) < 25_000
        # Must not exceed 20,000 + truncation note
        assert len(stored) <= 20_000 + 200  # some buffer for the note
        # Must contain the truncation note
        assert "truncated" in stored

    def test_message_exactly_20000_chars_is_not_truncated(self, cid):
        """A message exactly at the limit should be stored unchanged."""
        exact_msg = "B" * 20_000
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": exact_msg, "visitor_name": "Tester"},
        )
        assert resp.status_code == 200

        msgs = client.get(f"/api/conversation/{cid}").json()["messages"]
        visitor_msgs = [m for m in msgs if m["role"] == "visitor"]
        assert visitor_msgs
        stored = visitor_msgs[0]["content"]
        assert len(stored) == 20_000
        assert "truncated" not in stored

    def test_message_under_20000_chars_is_not_truncated(self, cid):
        """A short message is stored verbatim."""
        short_msg = "Hello, digital twin!"
        resp = client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": short_msg, "visitor_name": "Tester"},
        )
        assert resp.status_code == 200

        msgs = client.get(f"/api/conversation/{cid}").json()["messages"]
        visitor_msgs = [m for m in msgs if m["role"] == "visitor"]
        assert visitor_msgs
        assert visitor_msgs[0]["content"] == short_msg


# ---------------------------------------------------------------------------
# Polling tests
# ---------------------------------------------------------------------------

class TestPolling:
    def test_poll_no_after_returns_all_messages(self, cid):
        # Seed a message
        client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q1", "visitor_name": "Tester"},
        )
        resp = client.get(f"/api/poll/{cid}")
        assert resp.status_code == 200
        msgs = resp.json()["messages"]
        assert len(msgs) >= 2

    def test_poll_with_future_after_returns_empty(self, cid):
        client.post(
            "/api/chat",
            json={"conversation_id": cid, "message": "Q1"},
        )
        # Use a far-future timestamp; nothing should be after it
        resp = client.get(f"/api/poll/{cid}?after=2099-01-01T00:00:00.000000")
        assert resp.status_code == 200
        assert resp.json()["messages"] == []

    def test_poll_empty_conversation_returns_empty(self, cid):
        resp = client.get(f"/api/poll/{cid}")
        assert resp.status_code == 200
        assert resp.json()["messages"] == []


# ---------------------------------------------------------------------------
# Admin workflow tests
# ---------------------------------------------------------------------------

class TestAdminWorkflow:
    def test_list_conversations_with_auth_returns_200(self, admin_client):
        resp = admin_client.get("/admin/api/conversations")
        assert resp.status_code == 200
        body = resp.json()
        assert "conversations" in body
        assert isinstance(body["conversations"], list)

    def test_post_human_message_appears_in_thread(self, authed_cid):
        admin_cl, conversation_id = authed_cid

        # Seed a visitor message first via public API
        client.post(
            "/api/chat",
            json={"conversation_id": conversation_id, "message": "Q1", "visitor_name": "Test"},
        )

        # Admin posts a human message
        resp = admin_cl.post(
            f"/admin/api/conversations/{conversation_id}/message",
            json={"content": "Hello from the human owner!"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "message" in body
        assert body["message"]["role"] == "human"
        assert body["message"]["content"] == "Hello from the human owner!"

    def test_get_conversation_thread_via_admin(self, authed_cid):
        admin_cl, conversation_id = authed_cid

        # Seed via public API
        client.post(
            "/api/chat",
            json={"conversation_id": conversation_id, "message": "Q1", "visitor_name": "Test"},
        )

        # Admin fetches the thread
        resp = admin_cl.get(f"/admin/api/conversations/{conversation_id}")
        assert resp.status_code == 200
        msgs = resp.json()["messages"]
        assert len(msgs) >= 2

    def test_get_thread_marks_messages_as_read(self, authed_cid):
        admin_cl, conversation_id = authed_cid

        # Seed via public API
        client.post(
            "/api/chat",
            json={"conversation_id": conversation_id, "message": "Q1", "visitor_name": "Test"},
        )

        # Fetch thread via admin → marks read
        resp = admin_cl.get(f"/admin/api/conversations/{conversation_id}")
        assert resp.status_code == 200
        msgs = resp.json()["messages"]
        # After opening the thread all rows should be read=True
        for m in msgs:
            assert m["read"] is True, f"Message {m['id']} was not marked read"

    def test_resolve_returns_ok(self, authed_cid):
        admin_cl, conversation_id = authed_cid

        # Seed
        client.post(
            "/api/chat",
            json={"conversation_id": conversation_id, "message": "Q1"},
        )

        resp = admin_cl.post(f"/admin/api/conversations/{conversation_id}/resolve")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_human_message_appears_in_public_conversation(self, authed_cid):
        admin_cl, conversation_id = authed_cid

        # Post human message from admin
        admin_cl.post(
            f"/admin/api/conversations/{conversation_id}/message",
            json={"content": "I'm here!"},
        )

        # Fetch via public API
        resp = client.get(f"/api/conversation/{conversation_id}")
        assert resp.status_code == 200
        msgs = resp.json()["messages"]
        human_msgs = [m for m in msgs if m["role"] == "human"]
        assert human_msgs, "Human message not visible in public conversation fetch"
        assert human_msgs[0]["content"] == "I'm here!"

    def test_conversation_appears_in_admin_list_after_message(self, authed_cid):
        admin_cl, conversation_id = authed_cid

        # Post a message to create the conversation
        client.post(
            "/api/chat",
            json={"conversation_id": conversation_id, "message": "Q1", "visitor_name": "Test"},
        )

        # Check it appears in admin list
        resp = admin_cl.get("/admin/api/conversations")
        assert resp.status_code == 200
        convo_ids = [c["conversation_id"] for c in resp.json()["conversations"]]
        assert conversation_id in convo_ids

    def test_admin_list_summary_has_expected_fields(self, authed_cid):
        admin_cl, conversation_id = authed_cid

        client.post(
            "/api/chat",
            json={"conversation_id": conversation_id, "message": "Q3", "visitor_name": "Test"},
        )

        resp = admin_cl.get("/admin/api/conversations")
        convos = resp.json()["conversations"]
        convo = next((c for c in convos if c["conversation_id"] == conversation_id), None)
        assert convo is not None

        # Must have these summary fields
        for field in ("conversation_id", "preview", "last_at", "has_unread", "has_attention", "message_count"):
            assert field in convo, f"Missing field: {field}"


# ---------------------------------------------------------------------------
# Session isolation / security tests
# ---------------------------------------------------------------------------

class TestSessionSecurity:
    def test_tampered_session_cookie_is_rejected(self):
        """A forged/tampered cookie must not grant admin access."""
        bad_client = TestClient(app, raise_server_exceptions=False, cookies={
            "avatar_admin_session": "tampered.invalid.token"
        })
        resp = bad_client.get("/admin/api/conversations")
        assert resp.status_code == 401

    def test_admin_check_with_tampered_cookie_returns_false(self):
        bad_client = TestClient(app, raise_server_exceptions=False, cookies={
            "avatar_admin_session": "tampered.invalid.token"
        })
        resp = bad_client.get("/admin/api/check")
        assert resp.status_code == 200
        assert resp.json()["authenticated"] is False

    def test_login_then_logout_removes_access(self):
        fresh = TestClient(app, raise_server_exceptions=False)
        # Login
        login_resp = fresh.post("/admin/login", json={"password": ADMIN_PASSWORD})
        assert login_resp.status_code == 200
        # Confirm access
        check_resp = fresh.get("/admin/api/check")
        assert check_resp.json()["authenticated"] is True
        # Logout
        fresh.post("/admin/logout")
        # Access should now be denied
        after_resp = fresh.get("/admin/api/check")
        assert after_resp.json()["authenticated"] is False


# ---------------------------------------------------------------------------
# Truncation unit-level test (import the function directly)
# ---------------------------------------------------------------------------

class TestTruncateFunction:
    def test_truncate_function_clips_long_strings(self):
        from app.routes.chat import truncate_message
        long = "X" * 25_000
        result = truncate_message(long)
        assert len(result) <= 20_000 + 200  # note adds ~88 chars
        assert result.startswith("X" * 20_000)
        assert "truncated" in result

    def test_truncate_function_leaves_short_strings_intact(self):
        from app.routes.chat import truncate_message
        short = "hello"
        assert truncate_message(short) == "hello"

    def test_truncate_function_leaves_exactly_20000_intact(self):
        from app.routes.chat import truncate_message
        msg = "Y" * 20_000
        assert truncate_message(msg) == msg
