// Part D — durable habit logging under concurrency.
// Proves: functional optimistic updates, out-of-order response safety,
// no lost writes during rapid input, and an honest retry state.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDailyHabits } from "@/hooks/useDailyHabits";

type Deferred = {
  resolve: (v: { data: unknown; error: unknown }) => void;
  promise: Promise<{ data: unknown; error: unknown }>;
};

const pending: Deferred[] = [];
let upsertBodies: Record<string, unknown>[] = [];

function defer(): Deferred {
  let resolve!: Deferred["resolve"];
  const promise = new Promise<{ data: unknown; error: unknown }>((r) => (resolve = r));
  return { resolve, promise };
}

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "member-a" }, timezone: "America/Jamaica" }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const emptyList = { data: [], error: null };
  const emptyOne = { data: null, error: null };
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(emptyOne),
              then: (r: (v: unknown) => void) => r(emptyList),
            }),
            order: () => ({ limit: () => Promise.resolve(emptyList) }),
            then: (r: (v: unknown) => void) => r(emptyList),
          }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        delete: () => ({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) }),
        upsert: (body: Record<string, unknown>) => {
          if (table === "meal_logs") {
            upsertBodies.push(body);
            const d = defer();
            pending.push(d);
            return { select: () => ({ maybeSingle: () => d.promise }) };
          }
          return { select: () => ({ maybeSingle: () => Promise.resolve(emptyOne) }) };
        },
      }),
    },
  };
});

beforeEach(() => {
  pending.length = 0;
  upsertBodies = [];
});

const meal = (over: Record<string, unknown> = {}) => ({
  meal_type: "breakfast",
  vegetables: true,
  protein: false,
  complex_carbs: false,
  free_text: null,
  ...over,
});

describe("useDailyHabits — meal write concurrency", () => {
  it("applies the toggle optimistically before the server responds", async () => {
    const { result } = renderHook(() => useDailyHabits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.saveMeal("breakfast", { vegetables: true });
    });

    expect(result.current.meals.breakfast.vegetables).toBe(true);
    expect(result.current.mealSaveState.breakfast).toBe("saving");
  });

  it("ignores a stale response that resolves after a newer write", async () => {
    const { result } = renderHook(() => useDailyHabits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.saveMeal("breakfast", { vegetables: true });
    });
    act(() => {
      void result.current.saveMeal("breakfast", { protein: true });
    });

    // Resolve in reverse order: newest first, then the stale first write.
    await act(async () => {
      pending[1].resolve({ data: meal({ vegetables: true, protein: true }), error: null });
      pending[0].resolve({ data: meal({ vegetables: true, protein: false }), error: null });
      await Promise.resolve();
    });

    expect(result.current.meals.breakfast.protein).toBe(true);
    expect(result.current.meals.breakfast.vegetables).toBe(true);
  });

  it("reaches 3/3 durably after rapid successive selections", async () => {
    const { result } = renderHook(() => useDailyHabits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.saveMeal("breakfast", { vegetables: true });
      void result.current.saveMeal("breakfast", { protein: true });
      void result.current.saveMeal("breakfast", { complex_carbs: true });
    });

    // Each write carries the accumulated intent, so no selection is lost.
    const last = upsertBodies[upsertBodies.length - 1];
    expect(last.vegetables).toBe(true);
    expect(last.protein).toBe(true);
    expect(last.complex_carbs).toBe(true);

    await act(async () => {
      pending.forEach((d, i) =>
        d.resolve({
          data: meal({ vegetables: true, protein: i >= 1, complex_carbs: i >= 2 }),
          error: null,
        }),
      );
      await Promise.resolve();
    });

    const m = result.current.meals.breakfast;
    expect(m.vegetables && m.protein && m.complex_carbs).toBe(true);
    expect(result.current.mealSaveState.breakfast).toBe("idle");
  });

  it("surfaces an honest retry state on failure and keeps the local value", async () => {
    const { result } = renderHook(() => useDailyHabits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.saveMeal("breakfast", { vegetables: true });
    });
    await act(async () => {
      pending[0].resolve({ data: null, error: { message: "network" } });
      await Promise.resolve();
    });

    expect(result.current.mealSaveState.breakfast).toBe("error");
    expect(result.current.meals.breakfast.vegetables).toBe(true);

    act(() => {
      void result.current.retryMeal("breakfast");
    });
    expect(result.current.mealSaveState.breakfast).toBe("saving");
    // The retry replays the last local intent, not a blank row.
    expect(upsertBodies[upsertBodies.length - 1].vegetables).toBe(true);

    await act(async () => {
      pending[1].resolve({ data: meal({ vegetables: true }), error: null });
      await Promise.resolve();
    });
    expect(result.current.mealSaveState.breakfast).toBe("idle");
  });
});
