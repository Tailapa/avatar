# Frontend Test Plan — Avatar Digital Twin

Tested with Playwright + Chromium against `http://localhost:8000` (FastAPI serving the Vite build).

## Setup

- **Test runner:** `@playwright/test` v1.61.0
- **Browser:** Chromium (headless)
- **Config:** `frontend/playwright.config.ts`
- **Test files:** `frontend/tests/visitor-chat.spec.ts`, `frontend/tests/admin-dashboard.spec.ts`
- **Screenshots:** `frontend/tests/screenshots/`

Run tests (server must be running first):
```bash
cd "F:\Agentic AI\avatar\backend" && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
cd "F:\Agentic AI\avatar\frontend" && npx playwright test --reporter=list
```

---

## Visitor Chat (`visitor-chat.spec.ts`)

| # | Test | Status | Screenshot |
|---|------|--------|------------|
| 1 | Page loads with correct title and dark theme | [x] Pass | `01-visitor-chat-initial.png` |
| 2 | Intro section is visible on fresh load | [x] Pass | — |
| 3 | Composer textarea is autofocused | [x] Pass | — |
| 4 | Keep chat switch is on by default | [x] Pass | — |
| 5 | Theme toggle switches between dark and light | [x] Pass | `02-visitor-light-mode.png` |
| 6 | Qn instant answer works (Q1) — no LLM call, `.instant-tag` rendered | [x] Pass | `03-qn-instant-answer.png` |
| 7 | Visitor message appears in chat | [x] Pass | — |
| 8 | Intro section hides after first message | [x] Pass | — |
| 9 | Suggestion chip submits message on click | [x] Pass | `04-chip-click.png` |
| 10 | Name field value persists to localStorage across reload | [x] Pass | — |
| 11 | Reset button clears conversation and restores intro | [x] Pass | `05-after-reset.png` |
| 12 | LLM FAQ answer streams in for Q3 | [x] Pass | `06-faq-answer.png` |
| 13 | Deep link `?q=2` submits Q2 on page load | [x] Pass | `07-deep-link.png` |
| 14 | Mobile layout (390x844) renders correctly | [x] Pass | `08-mobile-visitor.png` |

---

## Admin Dashboard (`admin-dashboard.spec.ts`)

| # | Test | Status | Screenshot |
|---|------|--------|------------|
| 1 | Login screen shown when not authenticated | [x] Pass | `09-admin-login.png` |
| 2 | Wrong password shows `#loginError` | [x] Pass | `10-admin-login-error.png` |
| 3 | Correct password reveals `#dashboard`, hides `#loginScreen` | [x] Pass | `11-admin-dashboard.png` |
| 4 | Dashboard sidebar (`.sidebar`) visible after login | [x] Pass | `12-admin-inbox.png` |
| 5 | Theme toggle switches to light mode | [x] Pass | `13-admin-light.png` |
| 6 | Mobile layout (390x844) shows dashboard after login | [x] Pass | `14-admin-mobile.png` |

---

## Results Summary

- **Total tests:** 20
- **Passed:** 20
- **Failed:** 0
- **Screenshots taken:** 14

### Notes

- The `Qn instant answer` test initially failed with a Playwright strict-mode violation because
  two `.instant-tag` elements were present (caused by test-level cookie state carrying over a
  prior conversation). Fixed by targeting `.first()` instead of the full locator.
- The `suggestion chip submits message on click` test was failing due to a race condition:
  chip/composer/send event listeners were registered inside `init()` (after async fetches), so
  Playwright could click them before the listeners were attached. Fixed by moving all event
  listener registration to module-level (synchronous), before `init()` runs. The conversationId
  is now also resolved synchronously from cookie/localStorage at module level.
- All tests run against the real backend (Supabase + OpenRouter) so network latency is expected.
  The Q3 LLM streaming test uses a 15 s timeout which proved sufficient.
- The `?q=2` deep-link test verifies the URL parameter is consumed and a visitor message is
  rendered without needing to check the exact FAQ text.
- Screenshots and test conversation data in Supabase cleaned up after final run.
