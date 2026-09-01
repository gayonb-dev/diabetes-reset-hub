// Public-chat session regressions.
//
// The defect this covers: the widget used to hold its own copy of the session
// token, so "Delete this chat" (which reads the shared manager) reported
// "no active session" even while a chat was open. There must be exactly one
// token store.

import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));

const TOKEN = "a".repeat(64);
const TOKEN2 = "b".repeat(64);

async function fresh() {
  vi.resetModules();
  return await import("@/lib/chatSession");
}

beforeEach(() => {
  invoke.mockReset();
});

describe("chatSession, single shared token store", () => {
  it("startChatSession issues a token and exposes the server gate", async () => {
    invoke.mockResolvedValue({
      data: { session_token: TOKEN, ai_health_available: false, notice_version: "2026-08-07.1" },
      error: null,
    });
    const m = await fresh();
    const start = await m.startChatSession();
    expect(start.token).toBe(TOKEN);
    expect(start.aiHealthAvailable).toBe(false);
    expect(start.noticeVersion).toBe("2026-08-07.1");
    expect(m.hasChatSession()).toBe(true);
  });

  it("getChatSession returns the same token startChatSession issued", async () => {
    invoke.mockResolvedValue({
      data: { session_token: TOKEN, ai_health_available: false, notice_version: "v1" },
      error: null,
    });
    const m = await fresh();
    await m.startChatSession();
    expect(await m.getChatSession()).toBe(TOKEN);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("concurrent callers share one session-start request", async () => {
    invoke.mockResolvedValue({
      data: { session_token: TOKEN, ai_health_available: false, notice_version: "v1" },
      error: null,
    });
    const m = await fresh();
    const [a, b] = await Promise.all([m.startChatSession(), m.startChatSession()]);
    expect(a.token).toBe(b.token);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("deleteThisChat succeeds against the session the widget is using", async () => {
    invoke.mockImplementation((_fn: string, opts: { body: { action: string } }) => {
      if (opts.body.action === "start") {
        return Promise.resolve({
          data: { session_token: TOKEN, ai_health_available: false, notice_version: "v1" },
          error: null,
        });
      }
      return Promise.resolve({ data: { ok: true, deleted: { messages: 2 } }, error: null });
    });
    const m = await fresh();
    await m.startChatSession();
    const res = await m.deleteThisChat();
    expect(res.ok).toBe(true);
    expect(m.hasChatSession()).toBe(false);
  });

  it("a new session is issued after deletion rather than reusing the revoked one", async () => {
    let n = 0;
    invoke.mockImplementation((_fn: string, opts: { body: { action: string } }) => {
      if (opts.body.action === "start") {
        n += 1;
        return Promise.resolve({
          data: { session_token: n === 1 ? TOKEN : TOKEN2, ai_health_available: false, notice_version: "v1" },
          error: null,
        });
      }
      return Promise.resolve({ data: { ok: true, deleted: {} }, error: null });
    });
    const m = await fresh();
    await m.startChatSession();
    await m.deleteThisChat();
    const again = await m.startChatSession();
    expect(again.token).toBe(TOKEN2);
  });

  it("deleteThisChat without a session reports no_active_session", async () => {
    const m = await fresh();
    expect(await m.deleteThisChat()).toEqual({ ok: false, error: "no_active_session" });
  });

  it("a blocked origin fails closed: no token, health AI unavailable", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "origin_not_allowed" } });
    const m = await fresh();
    const start = await m.startChatSession();
    expect(start.token).toBeNull();
    expect(start.aiHealthAvailable).toBe(false);
    expect(m.hasChatSession()).toBe(false);
  });

  it("never writes the token to browser storage", async () => {
    invoke.mockResolvedValue({
      data: { session_token: TOKEN, ai_health_available: false, notice_version: "v1" },
      error: null,
    });
    const m = await fresh();
    await m.startChatSession();
    const dump = JSON.stringify({ ...localStorage...sessionStorage }) + document.cookie;
    expect(dump).not.toContain(TOKEN);
  });
});
