import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProgressReport from "@/pages/app/ProgressReport";

const bsRows = [
  { measured_at: "2026-01-02T08:00:00Z", value_mgdl: 60, reading_type: "fasting" },
  { measured_at: "2026-01-03T08:00:00Z", value_mgdl: 95, reading_type: "fasting" },
  { measured_at: "2026-01-04T08:00:00Z", value_mgdl: 45, reading_type: "fasting" },
];

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/integrations/supabase/client", () => {
  const make = (data: unknown) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq = self;
    chain.gte = self;
    chain.not = self;
    chain.order = self;
    chain.limit = self;
    chain.maybeSingle = () => Promise.resolve({ data: null });
    chain.then = (res: (v: unknown) => unknown) => Promise.resolve({ data }).then(res);
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => make(table === "blood_sugar_readings" ? bsRows : []),
    },
  };
});

describe("ProgressReport glucose table uses the shared classifier", () => {
  it("marks low and urgent-low readings with accessible text and no assertive announcement", async () => {
    render(
      <MemoryRouter>
        <ProgressReport />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Urgent low")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("In range")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Normal")).toBeNull();
  });
});
