// ============================================================================
// Avatar — Type-safe API client
// ============================================================================

export interface Message {
  id: string;
  conversation_id: string;
  conversation_name: string | null;
  role: 'visitor' | 'avatar' | 'human';
  content: string;
  tool_calls: unknown[] | null;
  needs_attention: boolean;
  read: boolean;
  created_at: string;
}

export interface ConversationSummary {
  conversation_id: string;
  conversation_name: string | null;
  preview: string;
  last_at: string;
  has_unread: boolean;
  has_attention: boolean;
  message_count: number;
}

// ---- Visitor API ----

export async function getConversation(conversationId: string): Promise<Message[]> {
  const res = await fetch(`/api/conversation/${conversationId}`);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to load conversation: ${res.status}`);
  }
  const data = await res.json();
  return data.messages ?? [];
}

export async function sendMessage(
  conversationId: string,
  message: string,
  visitorName: string | null,
  onToken: (text: string) => void,
  onToolStart: (tool: string, message: string) => void,
  onToolDone: (tool: string, message: string) => void,
  onDone: (fullText: string, instant?: boolean, faqNum?: number) => void,
  onError: (message: string) => void,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        visitor_name: visitorName,
      }),
    });
  } catch (e) {
    onError('Network error — please check your connection.');
    return;
  }

  if (!response.ok) {
    if (response.status === 429) {
      onError("You're sending messages too quickly. Please wait a moment.");
      return;
    }
    let msg = `Error ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail) msg = body.detail;
    } catch { /* ignore */ }
    onError(msg);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events line by line
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    let eventType = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (eventType === 'token') {
            onToken(data.text ?? '');
          } else if (eventType === 'tool_start') {
            onToolStart(data.tool ?? '', data.message ?? '');
          } else if (eventType === 'tool_done') {
            onToolDone(data.tool ?? '', data.message ?? '');
          } else if (eventType === 'instant') {
            onDone(data.text ?? '', true, data.faq_num);
          } else if (eventType === 'done') {
            onDone(data.full_text ?? '', data.instant, data.faq_num);
          } else if (eventType === 'error') {
            onError(data.message ?? 'An error occurred.');
          }
        } catch { /* ignore malformed data */ }
        eventType = '';
      }
    }
  }
}

export async function pollConversation(conversationId: string, after: string | null): Promise<Message[]> {
  const url = after
    ? `/api/poll/${conversationId}?after=${encodeURIComponent(after)}`
    : `/api/poll/${conversationId}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages ?? [];
}

// ---- Admin API ----

export async function adminLogin(password: string): Promise<{ success: boolean; ownerName: string }> {
  const res = await fetch('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    const data = await res.json();
    return { success: true, ownerName: data.owner_name ?? '' };
  }
  return { success: false, ownerName: '' };
}

export async function adminLogout(): Promise<void> {
  await fetch('/admin/logout', { method: 'POST' });
}

export async function checkAdminAuth(): Promise<{ authenticated: boolean; ownerName: string }> {
  try {
    const res = await fetch('/admin/api/check');
    if (res.ok) {
      const data = await res.json();
      return { authenticated: data.authenticated ?? false, ownerName: data.owner_name ?? '' };
    }
  } catch { /* ignore */ }
  return { authenticated: false, ownerName: '' };
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch('/admin/api/conversations');
  if (!res.ok) return [];
  const data = await res.json();
  return data.conversations ?? [];
}

export async function getAdminConversation(conversationId: string): Promise<Message[]> {
  const res = await fetch(`/admin/api/conversations/${conversationId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages ?? [];
}

export async function postHumanMessage(conversationId: string, content: string): Promise<Message> {
  const res = await fetch(`/admin/api/conversations/${conversationId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  const data = await res.json();
  return data.message;
}

export async function resolveConversation(conversationId: string): Promise<void> {
  await fetch(`/admin/api/conversations/${conversationId}/resolve`, { method: 'POST' });
}
