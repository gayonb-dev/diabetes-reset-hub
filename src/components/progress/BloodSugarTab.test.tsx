import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BloodSugarTab from "@/components/progress/BloodSugarTab";
import { GLUCOSE_LOW_MESSAGE, GLUCOSE_MEDICATION_WARNING, GLUCOSE_URGENT_LOW_MESSAGE } from "@/lib/glucose";

const insert = vi.fn().mockResolvedValue({ error: null });
let readings: unknown[] = [];

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/hooks/useGamification", () => ({ useGamification: () => ({ recordAction: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.limit = () => Promise.resolve({ data: readings });
  chain.insert = (...args: unknown[]) => insert(...args);
  return { supabase: { from: () => chain } };
});

beforeEach(() => {
  insert.mockClear();
  readings = [];
});

const reading = (value: number) => ({
  id: "r1",
  value_mgdl: value,
  reading_type: "fasting",
  measured_at: new Date().toISOString(),
  notes: null,
});

describe("BloodSugarTab — newly entered readings", () => {
  it("announces a low reading with role=alert and the medication warning", async () => {
    render(<BloodSugarTab />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 98"), { target: { value: "60" } });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(GLUCOSE_LOW_MESSAGE);
    expect(alert).toHaveTextContent(GLUCOSE_MEDICATION_WARNING);
  });

  it("uses the urgent-low copy below 54", async () => {
    render(<BloodSugarTab />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 98"), { target: { value: "45" } });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(GLUCOSE_URGENT_LOW_MESSAGE);
    expect(alert).toHaveTextContent(GLUCOSE_MEDICATION_WARNING);
  });

  it("shows no safety alert for an in-range reading", async () => {
    render(<BloodSugarTab />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 98"), { target: { value: "95" } });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

describe("BloodSugarTab — saved readings", () => {
  it("labels a saved low reading without an assertive announcement on load", async () => {
    readings = [reading(60)];
    render(<BloodSugarTab />);
    expect(await screen.findByText("Low")).toBeInTheDocument();
    expect(screen.getByText(GLUCOSE_LOW_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it('labels a saved in-range reading "In range" and never uses "Normal"', async () => {
    readings = [reading(95)];
    const { container } = render(<BloodSugarTab />);
    expect(await screen.findByText("In range")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\bNormal\b/);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("BloodSugarTab — validation blocks writes", () => {
  it("blocks an implausible value and does not insert", async () => {
    render(<BloodSugarTab />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 98"), { target: { value: "900" } });
    const save = screen.getByRole("button", { name: /save reading/i });
    await waitFor(() => expect(save).toBeDisabled());
    fireEvent.click(save);
    expect(insert).not.toHaveBeenCalled();
  });

  it("blocks a future timestamp and does not insert", async () => {
    render(<BloodSugarTab />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 98"), { target: { value: "95" } });
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    fireEvent.change(screen.getByLabelText("Timestamp"), { target: { value: future } });
    const save = screen.getByRole("button", { name: /save reading/i });
    await waitFor(() => expect(save).toBeDisabled());
    fireEvent.click(save);
    expect(insert).not.toHaveBeenCalled();
  });

  it("saves a valid reading", async () => {
    render(<BloodSugarTab />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 98"), { target: { value: "95" } });
    fireEvent.click(screen.getByRole("button", { name: /save reading/i }));
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
  });
});
