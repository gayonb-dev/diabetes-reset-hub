import { describe, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "a" }, timezone: "America/Jamaica" }) }));
vi.mock("@/integrations/supabase/client", () => {
  const emptyList = { data: [], error: null };
  const emptyOne = { data: null, error: null };
  return { supabase: { from: (t: string) => (console.log("FROM", t), {
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(emptyOne), then: (r: any, j: any) => Promise.resolve(emptyList).then(r, j) }), order: () => ({ limit: () => Promise.resolve(emptyList) }), then: (r: any, j: any) => Promise.resolve(emptyList).then(r, j) }) }),
  }) } };
});
import { useDailyHabits } from "@/hooks/useDailyHabits";
describe("dbg", () => { it("loads", async () => {
  globalThis.addEventListener?.("unhandledrejection", (e:any)=>console.log("REJ", e.reason));
  const { result } = renderHook(() => useDailyHabits());
  await waitFor(() => { if (result.current.loading) throw new Error("still loading"); }, { timeout: 2000 }).catch(e => console.log("FAILED", e.message));
  console.log("loading:", result.current.loading);
}); });
