import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import RetiredRoute from "@/components/RetiredRoute";
import RetiredOfferRoute from "@/components/RetiredOfferRoute";

const authState = { user: null as { id: string } | null, loading: false };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/intake"
            element={<RetiredRoute authedTo="/app/onboarding" anonTo="/login?next=%2Fapp%2Fonboarding" />}
          />
          <Route
            path="/progress"
            element={<RetiredRoute authedTo="/app/progress" anonTo="/login?next=%2Fapp%2Fprogress" />}
          />
          <Route path="/book" element={<RetiredOfferRoute />} />
          <Route path="/6-week-reset" element={<RetiredOfferRoute />} />
          <Route path="/six-week-reset" element={<RetiredOfferRoute />} />
          <Route path="/coaching" element={<RetiredOfferRoute />} />
          <Route path="/login" element={<Probe label="login" />} />
          <Route path="/app/onboarding" element={<Probe label="onboarding" />} />
          <Route path="/app/progress" element={<Probe label="app-progress" />} />
          <Route path="/" element={<Probe label="home" />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function Probe({ label }: { label: string }) {
  return (
    <div data-testid="probe" data-label={label}>
      {`${label}${window.location.search}`}
    </div>
  );
}

function landed() {
  const el = screen.getByTestId("probe");
  return el.getAttribute("data-label");
}

describe("retired routes", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it("/intake anonymous → login with next=/app/onboarding", () => {
    const { container } = renderAt("/intake");
    expect(landed()).toBe("login");
    // No retired intake form content is ever rendered.
    expect(container.querySelector("form")).toBeNull();
  });

  it("/intake authenticated → /app/onboarding", () => {
    authState.user = { id: "u1" };
    renderAt("/intake");
    expect(landed()).toBe("onboarding");
  });

  it("/progress anonymous → login with next=/app/progress", () => {
    renderAt("/progress");
    expect(landed()).toBe("login");
  });

  it("/progress authenticated → /app/progress", () => {
    authState.user = { id: "u1" };
    renderAt("/progress");
    expect(landed()).toBe("app-progress");
  });

  it.each(["/book", "/6-week-reset", "/six-week-reset", "/coaching"])(
    "%s → home pricing anchor",
    (path) => {
      renderAt(path);
      expect(landed()).toBe("home");
    },
  );

  it("renders nothing while auth is still loading (no /login flash for members)", () => {
    authState.loading = true;
    renderAt("/intake");
    expect(screen.queryByTestId("probe")).toBeNull();
  });
});

describe("retired route targets encode the allowed next destination", () => {
  it("uses the exact authority-specified login targets", () => {
    expect(encodeURIComponent("/app/onboarding")).toBe("%2Fapp%2Fonboarding");
    expect(encodeURIComponent("/app/progress")).toBe("%2Fapp%2Fprogress");
  });
});
