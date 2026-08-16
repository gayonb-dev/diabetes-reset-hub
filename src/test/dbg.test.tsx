import { describe, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "a" }, timezone: "America/Jamaica" }) }));
vi.mock("@/integrations/supabase/client", () => {
  const emptyList = { data: [], error: null };
  const emptyOne = { data: null, error: null };
  return { supabase: { from: () => ({
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(emptyOne), then: (r: any) => r(emptyList) }), order: () => ({ limit: () => Promise.resolve(emptyList) }), then: (r: any) => r(emptyList) }) }),
  }) } };
});
import { useDailyHabits } from "@/hooks/useDailyHabits";
describe("dbg", () => { it("loads", async () => {
  const { result } = renderHook(() => useDailyHabits());
  await waitFor(() => { if (result.current.loading) throw new Error("still loading"); }, { timeout: 2000 }).catch(e => console.log("FAILED", e.message));
  console.log("loading:", result.current.loading);
}); });
