// ============================================================================
// Avatar — Visitor Chat (main.ts)
// ============================================================================

import { getConversation, sendMessage, pollConversation, type Message } from './api.js';

// ---- Utilities ----

function generateUUID(): string {
  return crypto.randomUUID();
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift() ?? null;
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDaySep(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return `Today · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

// ---- Message rendering ----

function renderVisitorMessage(content: string, visitorName: string | null, time: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'msg msg--visitor';
  const initials = getInitials(visitorName);
  el.innerHTML = `
    <span class="avatar-initials">${initials}</span>
    <div class="msg-body">
      <div class="msg-meta"><span class="msg-time">${time}</span></div>
      <div class="bubble"><p>${renderMarkdown(content)}</p></div>
    </div>
  `;
  return el;
}

function renderAvatarMessage(
  content: string,
  time: string,
  isInstant?: boolean,
  faqNum?: number
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'msg msg--avatar';
  const instantTag = isInstant && faqNum
    ? `<span class="instant-tag">instant · Q${faqNum}</span>`
    : '';
  el.innerHTML = `
    <div class="avatar avatar-twin" style="background-image:url('/avatar-robot-round.png')"></div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-name">Avatar</span>
        ${instantTag}
        <span class="msg-time">${time}</span>
      </div>
      <div class="bubble"><p>${renderMarkdown(content)}</p></div>
    </div>
  `;
  return el;
}

function renderHumanMessage(content: string, ownerName: string, time: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'msg msg--human';
  el.innerHTML = `
    <div class="avatar avatar-human" style="background-image:url('/avatar-human.png')">
      <span class="spark-badge"><svg class="icon"><use href="#i-spark"/></svg></span>
    </div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="human-tag"><svg class="icon"><use href="#i-live"/></svg> ${ownerName} · live</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="bubble"><p>${renderMarkdown(content)}</p></div>
    </div>
  `;
  return el;
}

function renderToolStatus(tool: string, isDone: boolean, message: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `tool-status${isDone ? ' is-done' : ''}`;
  const iconId = isDone ? 'i-check' : 'i-tool';
  el.innerHTML = `<svg class="icon"><use href="#${iconId}"/></svg> ${message}`;
  return el;
}

function renderDaySep(label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'day-sep';
  el.innerHTML = `<span>${label}</span>`;
  return el;
}

// ---- DOM refs ----

const convoEl = document.getElementById('convo')!;
const convoInner = document.getElementById('convoInner')!;
const introSection = document.getElementById('introSection')!;
const typingWrap = document.getElementById('typingWrap')!;
const composerTextarea = document.getElementById('composerTextarea') as HTMLTextAreaElement;
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const nameInput = document.getElementById('nameInput') as HTMLInputElement;
const keepChatInput = document.getElementById('keepChatInput') as HTMLInputElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const themeToggle = document.getElementById('themeToggle')!;
const errorToast = document.getElementById('errorToast')!;
const brandSub = document.getElementById('brandSub')!;
const introOwnerName = document.getElementById('introOwnerName')!;

// ---- State ----

// Synchronously resolve conversationId from cookie/localStorage so that
// handleSend() works correctly even before init()'s async fetches complete.
const _savedKeepChatSync = localStorage.getItem('avatar-keep-chat');
let keepChat: boolean = _savedKeepChatSync !== 'false';
let conversationId: string = (() => {
  if (keepChat) {
    const saved = getCookie('avatar-conv-id');
    if (saved) return saved;
    const id = generateUUID();
    setCookie('avatar-conv-id', id, 365);
    return id;
  }
  return generateUUID();
})();

let visitorName: string | null = null;
let lastActivityTime: number = Date.now();
let pollIntervalId: number | null = null;
let lastPollTime: string | null = null;
let isStreaming = false;
let ownerName = 'the';
let currentStreamingMsgEl: HTMLElement | null = null;
let currentStreamingBubble: HTMLElement | null = null;
let currentStreamingToolStatuses: Map<string, HTMLElement> = new Map();
let toastTimeout: number | null = null;
let lastDaySep: string | null = null;

// ---- Theme ----

function syncThemeIcon(): void {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const moon = themeToggle.querySelector('.theme-moon') as HTMLElement;
  const sun = themeToggle.querySelector('.theme-sun') as HTMLElement;
  if (moon) moon.style.display = dark ? '' : 'none';
  if (sun) sun.style.display = dark ? 'none' : '';
}

function initTheme(): void {
  const saved = localStorage.getItem('avatar-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  syncThemeIcon();
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('avatar-theme', next);
  syncThemeIcon();
});

// Sync theme when parent (portfolio) writes to the shared localStorage key.
// The 'storage' event fires in all same-origin frames EXCEPT the writer,
// so this reliably receives changes from the portfolio page without postMessage.
window.addEventListener('storage', (e: StorageEvent) => {
  if (e.key === 'avatar-theme' && e.newValue) {
    document.documentElement.setAttribute('data-theme', e.newValue);
    syncThemeIcon();
  }
});

// ---- Error toast ----

function showError(msg: string): void {
  errorToast.textContent = msg;
  errorToast.style.display = 'block';
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    errorToast.style.display = 'none';
  }, 5000);
}

// ---- Scroll ----

function scrollToBottom(): void {
  convoEl.scrollTop = convoEl.scrollHeight;
}

// ---- Intro section ----

function hideIntro(): void {
  introSection.style.display = 'none';
}

function showIntro(): void {
  introSection.style.display = '';
}

// ---- Day separator logic ----

function maybeAddDaySep(isoString: string): void {
  const date = new Date(isoString);
  const dayKey = date.toDateString();
  if (dayKey !== lastDaySep) {
    lastDaySep = dayKey;
    convoInner.appendChild(renderDaySep(formatDaySep(isoString)));
  }
}

// ---- Render loaded messages ----

function renderMessages(messages: Message[]): void {
  // Remove everything except the intro section
  const children = Array.from(convoInner.children);
  for (const child of children) {
    if (child !== introSection) child.remove();
  }
  lastDaySep = null;

  if (messages.length === 0) {
    showIntro();
    return;
  }

  hideIntro();

  for (const msg of messages) {
    maybeAddDaySep(msg.created_at);
    const time = formatTime(msg.created_at);

    if (msg.role === 'visitor') {
      const el = renderVisitorMessage(msg.content, msg.conversation_name, time);
      convoInner.appendChild(el);
    } else if (msg.role === 'avatar') {
      const el = renderAvatarMessage(msg.content, time);
      convoInner.appendChild(el);
    } else if (msg.role === 'human') {
      const el = renderHumanMessage(msg.content, ownerName, time);
      convoInner.appendChild(el);
    }

    // Track latest message time for polling
    if (!lastPollTime || msg.created_at > lastPollTime) {
      lastPollTime = msg.created_at;
    }
  }

  scrollToBottom();
}

// ---- Start streaming avatar message ----

function startAvatarStream(): { msgEl: HTMLElement; bubbleEl: HTMLElement } {
  hideIntro();
  maybeAddDaySep(new Date().toISOString());
  const now = formatTime(new Date().toISOString());

  const msgEl = document.createElement('div');
  msgEl.className = 'msg msg--avatar';
  msgEl.innerHTML = `
    <div class="avatar avatar-twin" style="background-image:url('/avatar-robot-round.png')"></div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-name">Avatar</span>
        <span class="msg-time">${now}</span>
      </div>
    </div>
  `;
  const msgBody = msgEl.querySelector('.msg-body')!;

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'bubble';
  msgBody.appendChild(bubbleEl);

  convoInner.appendChild(msgEl);
  currentStreamingMsgEl = msgEl;
  currentStreamingBubble = bubbleEl;
  currentStreamingToolStatuses = new Map();

  return { msgEl, bubbleEl };
}

// ---- Composer auto-grow ----

function autoGrow(ta: HTMLTextAreaElement): void {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

// ---- Send message ----

async function handleSend(): Promise<void> {
  const text = composerTextarea.value.trim();
  if (!text || isStreaming) return;

  // Check for Qn shortcut
  const qnMatch = text.match(/^[Qq](\d+)$/);

  isStreaming = true;
  sendBtn.disabled = true;
  composerTextarea.value = '';
  autoGrow(composerTextarea);
  lastActivityTime = Date.now();

  // Add visitor message
  hideIntro();
  maybeAddDaySep(new Date().toISOString());
  const visitorEl = renderVisitorMessage(text, visitorName, formatTime(new Date().toISOString()));
  convoInner.appendChild(visitorEl);
  scrollToBottom();

  // Show typing indicator
  typingWrap.style.display = '';
  scrollToBottom();

  let streamingBubble: HTMLElement | null = null;
  let streamingMsgEl: HTMLElement | null = null;
  let accumulatedText = '';

  try {
    await sendMessage(
      conversationId,
      text,
      visitorName,
      // onToken
      (tokenText: string) => {
        if (!streamingMsgEl) {
          typingWrap.style.display = 'none';
          const result = startAvatarStream();
          streamingMsgEl = result.msgEl;
          streamingBubble = result.bubbleEl;
        }
        accumulatedText += tokenText;
        if (streamingBubble) {
          streamingBubble.innerHTML = `<p>${renderMarkdown(accumulatedText)}</p>`;
        }
        scrollToBottom();
      },
      // onToolStart
      (tool: string, message: string) => {
        typingWrap.style.display = 'none';
        if (!streamingMsgEl) {
          const result = startAvatarStream();
          streamingMsgEl = result.msgEl;
          streamingBubble = result.bubbleEl;
        }
        const msgBody = streamingMsgEl!.querySelector('.msg-body')!;
        const toolEl = renderToolStatus(tool, false, message);
        // Insert tool status before the bubble
        if (streamingBubble && msgBody.contains(streamingBubble)) {
          msgBody.insertBefore(toolEl, streamingBubble);
        } else {
          msgBody.appendChild(toolEl);
        }
        currentStreamingToolStatuses.set(tool, toolEl);
        scrollToBottom();
      },
      // onToolDone
      (tool: string, message: string) => {
        const existing = currentStreamingToolStatuses.get(tool);
        if (existing) {
          existing.className = 'tool-status is-done';
          existing.innerHTML = `<svg class="icon"><use href="#i-check"/></svg> ${message}`;
        }
        scrollToBottom();
      },
      // onDone
      (fullText: string, instant?: boolean, faqNum?: number) => {
        typingWrap.style.display = 'none';
        if (!streamingMsgEl) {
          // Instant answer — create fresh message element
          const result = startAvatarStream();
          streamingMsgEl = result.msgEl;
          streamingBubble = result.bubbleEl;
        }
        // Update bubble with final text
        if (streamingBubble) {
          streamingBubble.innerHTML = `<p>${renderMarkdown(fullText)}</p>`;
        }
        // Add instant tag if needed
        if (instant && faqNum && streamingMsgEl) {
          const metaEl = streamingMsgEl.querySelector('.msg-meta')!;
          const tag = document.createElement('span');
          tag.className = 'instant-tag';
          tag.textContent = `instant · Q${faqNum}`;
          const timeEl = metaEl.querySelector('.msg-time');
          if (timeEl) metaEl.insertBefore(tag, timeEl);
          else metaEl.appendChild(tag);
        }
        // Track poll time
        lastPollTime = new Date().toISOString();
        scrollToBottom();
      },
      // onError
      (errorMsg: string) => {
        typingWrap.style.display = 'none';
        // Remove streaming message if empty
        if (streamingMsgEl && !accumulatedText) {
          streamingMsgEl.remove();
        }
        showError(errorMsg);
      }
    );
  } catch (e) {
    typingWrap.style.display = 'none';
    showError('Something went wrong. Please try again.');
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    composerTextarea.focus();
    // For Qn shortcuts, we don't add to pollTime here (handled in onDone)
    if (!qnMatch) {
      lastPollTime = new Date().toISOString();
    }
  }
}

// ---- Polling for human messages ----

function startPolling(): void {
  if (pollIntervalId !== null) return;

  async function poll(): Promise<void> {
    try {
      const messages = await pollConversation(conversationId, lastPollTime);
      if (messages.length > 0) {
        lastActivityTime = Date.now();
        for (const msg of messages) {
          if (msg.role === 'human') {
            hideIntro();
            maybeAddDaySep(msg.created_at);
            const el = renderHumanMessage(msg.content, ownerName, formatTime(msg.created_at));
            convoInner.appendChild(el);
            scrollToBottom();
          }
          if (!lastPollTime || msg.created_at > lastPollTime) {
            lastPollTime = msg.created_at;
          }
        }
      }
    } catch { /* ignore poll errors */ }

    // Determine next interval: 10s if recent activity, 60s after 5min
    const elapsed = Date.now() - lastActivityTime;
    const nextInterval = elapsed > 5 * 60 * 1000 ? 60000 : 10000;
    pollIntervalId = window.setTimeout(poll, nextInterval);
  }

  pollIntervalId = window.setTimeout(poll, 10000);
}

function stopPolling(): void {
  if (pollIntervalId !== null) {
    clearTimeout(pollIntervalId);
    pollIntervalId = null;
  }
}

// ---- Init ----

async function init(): Promise<void> {
  initTheme();

  // Load persisted name
  const savedName = localStorage.getItem('avatar-visitor-name');
  if (savedName) {
    visitorName = savedName;
    nameInput.value = savedName;
  }

  // Sync keep-chat UI (conversationId already resolved at module level)
  keepChatInput.checked = keepChat;

  // Check for ?q=N deep link
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  if (qParam) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Load existing conversation
  try {
    const messages = await getConversation(conversationId);
    if (messages.length > 0) {
      renderMessages(messages);
      const sorted = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
      lastPollTime = sorted[sorted.length - 1].created_at;
    }
  } catch { /* new conversation */ }

  // Fetch owner name from backend (non-blocking UI update)
  try {
    const resp = await fetch('/api/config');
    if (resp.ok) {
      const data = await resp.json();
      ownerName = data.owner_name || 'the';
      brandSub.textContent = `${ownerName} · AI agent`;
      introOwnerName.textContent = `${ownerName}'s`;
      document.title = `Chat with ${ownerName}'s AI Agent`;
    }
  } catch { /* use defaults */ }

  // Auto-submit ?q=N deep link (after conversation loaded + owner name fetched)
  if (qParam) {
    composerTextarea.value = `Q${qParam}`;
    await handleSend();
  }

  // Focus composer
  composerTextarea.focus({ preventScroll: true });

  // Start polling
  startPolling();
}

// ---- Synchronous event listeners ----
// All registered before init() so they work immediately on page load,
// without waiting for async fetches (avoids race conditions in tests).

// Suggestion chips
document.getElementById('suggestRow')!.addEventListener('click', (e: Event) => {
  const chip = (e.target as Element).closest('.suggest-chip');
  if (chip) {
    composerTextarea.value = chip.textContent ?? '';
    handleSend();
  }
});

// Composer textarea
composerTextarea.addEventListener('input', () => autoGrow(composerTextarea));
composerTextarea.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Send button
sendBtn.addEventListener('click', () => handleSend());

// Name input
nameInput.addEventListener('input', () => {
  visitorName = nameInput.value.trim() || null;
  if (visitorName) {
    localStorage.setItem('avatar-visitor-name', visitorName);
  } else {
    localStorage.removeItem('avatar-visitor-name');
  }
});

// Keep chat toggle
keepChatInput.addEventListener('change', () => {
  keepChat = keepChatInput.checked;
  localStorage.setItem('avatar-keep-chat', String(keepChat));
  if (keepChat) {
    setCookie('avatar-conv-id', conversationId, 365);
  } else {
    deleteCookie('avatar-conv-id');
  }
});

// Reset button
resetBtn.addEventListener('click', () => {
  stopPolling();
  deleteCookie('avatar-conv-id');
  conversationId = generateUUID();
  lastDaySep = null;
  lastPollTime = null;

  if (keepChat) {
    setCookie('avatar-conv-id', conversationId, 365);
  }

  const children = Array.from(convoInner.children);
  for (const child of children) {
    if (child !== introSection) child.remove();
  }
  showIntro();

  startPolling();
  composerTextarea.focus();
});

init().catch(console.error);
