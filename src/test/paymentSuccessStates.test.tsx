import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import PaymentSuccess from "@/pages/PaymentSuccess";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));

function renderAt(search: string) {
  window.history.replaceState({}, "", `/payment-success${search}`);
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PaymentSuccess />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  invoke.mockReset();
});

describe("PaymentSuccess renders only the server-reported state", () => {
  it("verified state shows the active membership copy", async () => {
    invoke.mockResolvedValue({ data: { state: "verified" }, error: null });
    renderAt("?session_id=cs_live_abcdefghij123456");
    await waitFor(() => expect(screen.getByText(/membership is active/i)).toBeTruthy());
  });

  it("processing state never claims membership is active", async () => {
    invoke.mockResolvedValue({ data: { state: "processing" }, error: null });
    renderAt("?session_id=cs_live_abcdefghij123456");
    await waitFor(() => expect(screen.getByText(/Finishing setting up/i)).toBeTruthy());
    expect(screen.queryByText(/membership is active/i)).toBeNull();
  });

  it("unverified state is honest", async () => {
    invoke.mockResolvedValue({ data: { state: "unverified" }, error: null });
    renderAt("?session_id=cs_live_abcdefghij123456");
    await waitFor(() => expect(screen.getByText(/couldn't verify this checkout/i)).toBeTruthy());
  });

  it("transport failure renders the error state, not success", async () => {
    invoke.mockRejectedValue(new Error("network"));
    renderAt("?session_id=cs_live_abcdefghij123456");
    await waitFor(() => expect(screen.getAllByText(/couldn't reach our payment processor/i)[0]).toBeTruthy());
    expect(screen.queryByText(/membership is active/i)).toBeNull();
  });

  it("missing session_id is unverified without calling the server", async () => {
    renderAt("");
    await waitFor(() => expect(screen.getByText(/couldn't verify this checkout/i)).toBeTruthy());
    expect(invoke).not.toHaveBeenCalled();
  });

  it("no query parameter can force success — only the server response decides", async () => {
    invoke.mockResolvedValue({ data: { state: "unverified" }, error: null });
    renderAt("?session_id=cs_live_abcdefghij123456&state=verified&verified=true&status=paid");
    await waitFor(() => expect(screen.getByText(/couldn't verify this checkout/i)).toBeTruthy());
    expect(screen.queryByText(/membership is active/i)).toBeNull();
  });

  it("an unexpected server state is treated as an error, never as success", async () => {
    invoke.mockResolvedValue({ data: { state: "totally-fine" }, error: null });
    renderAt("?session_id=cs_live_abcdefghij123456");
    await waitFor(() => expect(screen.getAllByText(/couldn't reach our payment processor/i)[0]).toBeTruthy());
  });

  it("the page never provisions: it only invokes the read-only verifier", async () => {
    invoke.mockResolvedValue({ data: { state: "verified" }, error: null });
    renderAt("?session_id=cs_live_abcdefghij123456");
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    for (const call of invoke.mock.calls) {
      expect(call[0]).toBe("verify-checkout-session");
    }
  });
});
