import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useProgramDay } from "../hooks/useProgramDay";

// Mock supabase client
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("useProgramDay Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup for supabase
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    });
  });

  it("should return 1 when user is not logged in", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      subscription: null,
    });

    const { result } = renderHook(() => useProgramDay());

    // Should load immediately when there is no user
    expect(result.current).toBe(1);
  });

  it("should return sentinel 0 (not loaded) while profile is loading", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user_123" },
      subscription: null,
    });

    // Make the supabase query pending
    let resolveQuery: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveQuery = resolve;
    });
    mockMaybeSingle.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useProgramDay());

    // While loading, it should return 0
    expect(result.current).toBe(0);

    // Resolve the promise to clean up and wait for hook to process it
    await act(async () => {
      resolveQuery({ data: null, error: null });
    });
    await waitFor(() => {
      expect(result.current).toBe(1);
    });
  });

  it("should compute correct day based on profile program_start_date", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user_123" },
      subscription: null,
    });

    // Set program_start_date to 5 days ago (should be day 6)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const isoString = fiveDaysAgo.toISOString().slice(0, 10);

    mockMaybeSingle.mockResolvedValue({
      data: { program_start_date: isoString },
      error: null,
    });

    const { result } = renderHook(() => useProgramDay());

    // Initially 0 while query is pending
    expect(result.current).toBe(0);

    // Wait for state to update
    await waitFor(() => {
      expect(result.current).toBe(6);
    });
  });

  it("should fallback to subscription created_at if program_start_date is missing", async () => {
    // Set subscription created_at to 2 days ago (should be day 3)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    mockUseAuth.mockReturnValue({
      user: { id: "user_123" },
      subscription: { created_at: twoDaysAgo.toISOString() },
    });

    mockMaybeSingle.mockResolvedValue({
      data: { program_start_date: null },
      error: null,
    });

    const { result } = renderHook(() => useProgramDay());

    await waitFor(() => {
      expect(result.current).toBe(3);
    });
  });
});
