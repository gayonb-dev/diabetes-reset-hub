// P1: opaque chat session held in memory only.
//
// The browser holds one random token issued by the server. It is not a visitor
// UUID, not a database key, and it is never used as authorization by itself —
// the server resolves it to a session row and checks that the session is
// active. It is held in memory only — never in localStorage, sessionStorage,
// IndexedDB, a cookie or a URL — and it disappears on reload or chat deletion.

import { supabase } from "@/integrations/supabase/client";

let memoryToken: string | null = null;

function read(): string | null {
  return memoryToken && /^[a-f0-9]{64}$/i.test(memoryToken) ? memoryToken : null;
}

function write(token: string) {
  memoryToken = token;
}

export function clearChatSession() {
  memoryToken = null;
}

export function peekChatSession(): string | null {
  return read();
}

/** True when this browser tab currently holds an issued chat session token. */
export function hasChatSession(): boolean {
  return read() !== null;
}


let inflight: Promise<string | null> | null = null;

export async function getChatSession(): Promise<string | null> {
  const existing = read();
  if (existing) return existing;
  if (inflight) return inflight;

  inflight = (async () => {
    const { data, error } = await supabase.functions.invoke("visitor-session", {
      body: { action: "start" },
    });
    inflight = null;
    if (error || !data?.session_token) return null;
    write(data.session_token as string);
    return data.session_token as string;
  })();

  return inflight;
}

/** Deletes this session's conversation, messages, consent and derived records. */
export async function deleteThisChat(): Promise<{
  ok: boolean;
  error?: string;
  deleted?: Record<string, unknown>;
  processorVerified?: boolean;
}> {
  const token = read();
  if (!token) return { ok: false, error: "no_active_session" };

  const { data, error } = await supabase.functions.invoke("visitor-session", {
    body: { action: "delete_chat", session_token: token },
  });
  if (error) return { ok: false, error: error.message ?? "delete_failed" };

  clearChatSession();
  return {
    ok: true,
    deleted: (data?.deleted ?? {}) as Record<string, unknown>,
    processorVerified: data?.processor_deletion?.claimed === true,
  };
}

/** One-time, transactional bind of the active anonymous chat to the signed-in member. */
export async function mergeChatIntoAccount(): Promise<boolean> {
  const token = read();
  if (!token) return false;
  const { data, error } = await supabase.functions.invoke("visitor-session", {
    body: { action: "merge", session_token: token },
  });
  if (error || !data?.ok) return false;
  if (data.session_token) write(data.session_token as string);
  return true;
}
