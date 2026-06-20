// ============================================================================
// Avatar — Admin Dashboard (admin.ts)
// ============================================================================

import {
  adminLogin, adminLogout, checkAdminAuth,
  listConversations, getAdminConversation,
  postHumanMessage, resolveConversation,
  type Message, type ConversationSummary
} from './api.js';

// ---- Utilities (shared with main.ts) ----

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatConvoTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yest';
  } else {
    return date.toLocaleDateString([], { weekday: 'short' });
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

function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

function shortenId(id: string): string {
  return `conv_${id.slice(0, 6)}`;
}

// ---- DOM refs ----

const loginScreen = document.getElementById('loginScreen')!;
const dashboard = document.getElementById('dashboard')!;
const passwordInput = document.getElementById('passwordInput') as HTMLInputElement;
const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
const loginError = document.getElementById('loginError')!;
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
const ownerNameEl = document.getElementById('ownerName')!;
const themeToggle = document.getElementById('themeToggle')!;
const convoBadge = document.getElementById('convoBadge')!;
const convoList = document.getElementById('convoList')!;
const inboxEmpty = document.getElementById('inboxEmpty')!;
const threadEmpty = document.getElementById('threadEmpty')!;
const threadContent = document.getElementById('threadContent')!;
const threadInner = document.getElementById('threadInner')!;
const threadInitials = document.getElementById('threadInitials')!;
const threadName = document.getElementById('threadName')!;
const threadSub = document.getElementById('threadSub')!;
const attnFlag = document.getElementById('attnFlag')!;
const resolveBtn = document.getElementById('resolveBtn') as HTMLButtonElement;
const adminTextarea = document.getElementById('adminTextarea') as HTMLTextAreaElement;
const adminSendBtn = document.getElementById('adminSendBtn') as HTMLButtonElement;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;

// ---- State ----

let ownerName = 'You';
let conversations: ConversationSummary[] = [];
let filteredConversations: ConversationSummary[] = [];
let activeConversationId: string | null = null;
let activeConversationIndex: number = -1;
let refreshIntervalId: number | null = null;
let currentFilter: string = 'all';
let searchQuery: string = '';

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

// ---- Login / auth ----

async function showLogin(): Promise<void> {
  loginScreen.style.display = '';
  dashboard.style.display = 'none';
  passwordInput.value = '';
  loginError.style.display = 'none';
  setTimeout(() => passwordInput.focus(), 50);
}

async function showDashboard(owner: string): Promise<void> {
  ownerName = owner || 'You';
  ownerNameEl.textContent = ownerName;
  loginScreen.style.display = 'none';
  dashboard.style.display = 'flex';
  await loadConversations();
  startRefreshing();
}

loginBtn.addEventListener('click', async () => {
  const password = passwordInput.value;
  if (!password) return;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  const result = await adminLogin(password);
  loginBtn.disabled = false;
  loginBtn.innerHTML = '<svg class="icon icon--sm"><use href="#i-shield"/></svg> Sign In';

  if (result.success) {
    loginError.style.display = 'none';
    await showDashboard(result.ownerName);
  } else {
    loginError.textContent = 'Incorrect password. Please try again.';
    loginError.style.display = '';
    passwordInput.select();
  }
});

passwordInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', async () => {
  await adminLogout();
  stopRefreshing();
  activeConversationId = null;
  conversations = [];
  filteredConversations = [];
  await showLogin();
});

// ---- Conversation list rendering ----

function applyFilterAndSearch(): void {
  let result = conversations;

  // Filter
  if (currentFilter === 'attention') {
    result = result.filter(c => c.has_attention);
  } else if (currentFilter === 'unread') {
    result = result.filter(c => c.has_unread);
  }

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(c =>
      (c.conversation_name ?? '').toLowerCase().includes(q) ||
      c.preview.toLowerCase().includes(q)
    );
  }

  filteredConversations = result;
  renderConvoList();
}

function renderConvoList(): void {
  // Remove existing items
  const existing = convoList.querySelectorAll('.convo-item');
  existing.forEach(el => el.remove());

  if (filteredConversations.length === 0) {
    inboxEmpty.style.display = '';
    return;
  }
  inboxEmpty.style.display = 'none';

  filteredConversations.forEach((convo, idx) => {
    const el = document.createElement('div');
    el.className = 'convo-item';
    if (convo.conversation_id === activeConversationId) el.classList.add('is-active');
    if (convo.has_unread) el.classList.add('is-unread');
    if (convo.has_attention) el.classList.add('is-attention');

    const name = convo.conversation_name || 'Visitor';
    const initials = getInitials(name);
    const timeStr = formatConvoTime(convo.last_at);

    let sideContent = `<span class="msg-time">${timeStr}</span>`;
    if (convo.has_attention) {
      sideContent += `<span class="badge badge--attention"><svg class="icon" style="width:11px;height:11px"><use href="#i-spark"/></svg> Needs you</span>`;
    } else if (convo.has_unread) {
      sideContent += `<span class="badge badge--dot${convo.has_attention ? ' is-attention' : ''}"></span>`;
    } else {
      sideContent += `<svg class="icon icon--sm" style="color:var(--positive)"><use href="#i-check2"/></svg>`;
    }

    el.innerHTML = `
      <span class="avatar-initials">${initials}</span>
      <div class="convo-main">
        <div class="convo-top"><span class="convo-name">${escapeHtml(name)}</span></div>
        <div class="convo-preview">${escapeHtml(convo.preview)}</div>
      </div>
      <div class="convo-side">${sideContent}</div>
    `;

    el.addEventListener('click', () => {
      activeConversationIndex = idx;
      selectConversation(convo.conversation_id);
    });

    el.dataset.idx = String(idx);
    convoList.appendChild(el);
  });

  // Update badge
  const total = conversations.length;
  convoBadge.textContent = String(total);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadConversations(): Promise<void> {
  conversations = await listConversations();
  applyFilterAndSearch();
  // Update filter chips with counts
  updateFilterChips();
}

function updateFilterChips(): void {
  const attentionCount = conversations.filter(c => c.has_attention).length;
  const unreadCount = conversations.filter(c => c.has_unread).length;

  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    const filter = (chip as HTMLElement).dataset.filter;
    if (filter === 'attention') {
      chip.innerHTML = `<span class="dot-y"></span>Needs you${attentionCount > 0 ? ` · ${attentionCount}` : ''}`;
    } else if (filter === 'unread') {
      chip.textContent = `Unread${unreadCount > 0 ? ` · ${unreadCount}` : ''}`;
    }
  });
}

// ---- Thread rendering ----

async function selectConversation(conversationId: string): Promise<void> {
  activeConversationId = conversationId;

  // Update active state in list
  const items = convoList.querySelectorAll('.convo-item');
  items.forEach(item => {
    const idx = parseInt((item as HTMLElement).dataset.idx ?? '-1');
    const convo = filteredConversations[idx];
    item.classList.toggle('is-active', convo?.conversation_id === conversationId);
  });

  // Show thread panel
  threadEmpty.style.display = 'none';
  threadContent.style.display = 'flex';

  // Mobile: show main panel
  document.body.classList.add('thread-open');

  // Load messages
  const messages = await getAdminConversation(conversationId);

  // Find conversation summary
  const summary = conversations.find(c => c.conversation_id === conversationId);
  const name = summary?.conversation_name || 'Visitor';
  const initials = getInitials(name);

  // Update thread header
  threadInitials.textContent = initials;
  threadName.textContent = name;
  threadSub.textContent = `${shortenId(conversationId)} · ${messages.length} messages`;

  // Check attention flag
  const hasAttention = summary?.has_attention ?? false;
  attnFlag.style.display = hasAttention ? '' : 'none';

  // Update composer placeholder
  adminTextarea.placeholder = `Write a message to ${name}…`;

  // Render messages
  renderThreadMessages(messages);

  // Mark as read locally
  if (summary) {
    summary.has_unread = false;
    summary.has_attention = false;
    renderConvoList();
  }

  // Focus composer
  adminTextarea.focus({ preventScroll: true });
}

function renderThreadMessages(messages: Message[]): void {
  threadInner.innerHTML = '';
  let lastDaySep: string | null = null;

  for (const msg of messages) {
    const date = new Date(msg.created_at);
    const dayKey = date.toDateString();

    if (dayKey !== lastDaySep) {
      lastDaySep = dayKey;
      const sep = document.createElement('div');
      sep.className = 'day-sep';
      sep.innerHTML = `<span class="eyebrow">${date.toDateString() === new Date().toDateString() ? 'Today' : date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>`;
      threadInner.appendChild(sep);
    }

    const time = formatTime(msg.created_at);
    let el: HTMLElement;

    if (msg.role === 'visitor') {
      el = renderVisitorMsg(msg.content, msg.conversation_name, time);
    } else if (msg.role === 'avatar') {
      el = renderAvatarMsg(msg.content, time);
    } else {
      el = renderHumanMsg(msg.content, ownerName, time);
    }

    threadInner.appendChild(el);
  }

  // Scroll to bottom
  const thread = document.getElementById('thread')!;
  setTimeout(() => { thread.scrollTop = thread.scrollHeight; }, 50);
}

function renderVisitorMsg(content: string, name: string | null | undefined, time: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'msg msg--visitor';
  const initials = getInitials(name);
  el.innerHTML = `
    <span class="avatar-initials">${initials}</span>
    <div class="msg-body">
      <div class="msg-meta"><span class="msg-time">${time}</span></div>
      <div class="bubble"><p>${renderMarkdown(content)}</p></div>
    </div>
  `;
  return el;
}

function renderAvatarMsg(content: string, time: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'msg msg--avatar';
  el.innerHTML = `
    <div class="avatar avatar-twin" style="background-image:url('/avatar-robot-round.png')"></div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-name">Avatar</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="bubble"><p>${renderMarkdown(content)}</p></div>
    </div>
  `;
  return el;
}

function renderHumanMsg(content: string, owner: string, time: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'msg msg--human';
  el.innerHTML = `
    <div class="avatar avatar-human" style="background-image:url('/avatar-human.png')">
      <span class="spark-badge"><svg class="icon"><use href="#i-spark"/></svg></span>
    </div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="human-tag"><svg class="icon"><use href="#i-live"/></svg> You · sent to visitor</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="bubble"><p>${renderMarkdown(content)}</p></div>
    </div>
  `;
  return el;
}

// ---- Send human message ----

async function handleAdminSend(): Promise<void> {
  const text = adminTextarea.value.trim();
  if (!text || !activeConversationId) return;

  adminSendBtn.disabled = true;
  adminTextarea.value = '';
  autoGrow(adminTextarea);

  try {
    const msg = await postHumanMessage(activeConversationId, text);
    // Render the new message
    const time = formatTime(msg.created_at);
    const el = renderHumanMsg(msg.content, ownerName, time);
    threadInner.appendChild(el);

    const thread = document.getElementById('thread')!;
    thread.scrollTop = thread.scrollHeight;

    // Update conversation list preview
    const summary = conversations.find(c => c.conversation_id === activeConversationId);
    if (summary) {
      summary.preview = text.slice(0, 80);
      summary.last_at = msg.created_at;
      renderConvoList();
    }
  } catch (e) {
    console.error('Failed to send message:', e);
  } finally {
    adminSendBtn.disabled = false;
    adminTextarea.focus();
  }
}

// ---- Resolve conversation ----

resolveBtn.addEventListener('click', async () => {
  if (!activeConversationId) return;
  await resolveConversation(activeConversationId);
  attnFlag.style.display = 'none';
  const summary = conversations.find(c => c.conversation_id === activeConversationId);
  if (summary) {
    summary.has_attention = false;
    renderConvoList();
  }
});

// ---- Composer auto-grow ----

function autoGrow(ta: HTMLTextAreaElement): void {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

adminTextarea.addEventListener('input', () => autoGrow(adminTextarea));
adminTextarea.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAdminSend();
  }
});

adminSendBtn.addEventListener('click', () => handleAdminSend());

// ---- Keyboard navigation ----

document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Only if not typing in an input/textarea
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const dir = e.key === 'ArrowUp' ? -1 : 1;
    const newIdx = Math.max(0, Math.min(filteredConversations.length - 1, activeConversationIndex + dir));
    if (newIdx !== activeConversationIndex && filteredConversations[newIdx]) {
      activeConversationIndex = newIdx;
      selectConversation(filteredConversations[newIdx].conversation_id);
    }
  }
});

// ---- Filter chips ----

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('is-on'));
    chip.classList.add('is-on');
    currentFilter = (chip as HTMLElement).dataset.filter ?? 'all';
    applyFilterAndSearch();
  });
});

// ---- Search ----

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  applyFilterAndSearch();
});

// ---- Mobile back button ----

backBtn.addEventListener('click', () => {
  document.body.classList.remove('thread-open');
  activeConversationId = null;
  threadEmpty.style.display = '';
  threadContent.style.display = 'none';
});

// ---- Auto-refresh ----

function startRefreshing(): void {
  if (refreshIntervalId !== null) return;
  refreshIntervalId = window.setInterval(async () => {
    const prevActive = activeConversationId;
    await loadConversations();
    // If active conversation got new messages, reload it
    if (prevActive) {
      const summary = conversations.find(c => c.conversation_id === prevActive);
      if (summary?.has_unread) {
        // Silently reload
        const messages = await getAdminConversation(prevActive);
        renderThreadMessages(messages);
      }
    }
  }, 30000);
}

function stopRefreshing(): void {
  if (refreshIntervalId !== null) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

// ---- Init ----

async function init(): Promise<void> {
  initTheme();

  const { authenticated, ownerName: owner } = await checkAdminAuth();
  if (authenticated) {
    await showDashboard(owner);
  } else {
    await showLogin();
  }
}

init().catch(console.error);
