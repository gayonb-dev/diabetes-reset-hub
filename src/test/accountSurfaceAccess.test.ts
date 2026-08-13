// Prompt 5 correction — account controls survive billing restriction.
//
// The route matrix below is the executable statement of the rule: a member
// whose programme is restricted, disputed or being deleted stays SIGNED IN and
// keeps the surfaces they need to recover payment, cancel, export or close the
// account. Nobody is ever returned to the sign-in page for a billing reason.

import { describe, it, expect } from "vitest";
import { evaluateSubscriptionRow, surfaceAllowed, type Surface } from "@/lib/membership";
import { surfaceForPath, recoveryPathFor } from "@/lib/appSurfaces";

const NOW = Date.parse("2026-08-20T12:00:00Z");
const LONG_AGO = "2026-07-01T00:00:00Z";

const states = {
  allowed: () =>
    evaluateSubscriptionRow(
      { status: "active", current_period_end: "2026-09-01T00:00:00Z" },
      NOW,
    ),
  grace: () =>
    evaluateSubscriptionRow(
      { status: "past_due", grace_started_at: "2026-08-18T00:00:00Z" },
      NOW,
    ),
  restricted_billing: () =>
    evaluateSubscriptionRow({ status: "past_due", grace_started_at: LONG_AGO }, NOW),
  restricted_deletion: () =>
    evaluateSubscriptionRow({ status: "active" }, NOW, { deletionRestricted: true }),
};

describe("route surface mapping", () => {
  const cases: Array<[string, Surface]> = [
    ["/app", "programme"],
    ["/app/today", "programme"],
    ["/app/meals", "programme"],
    ["/app/progress/report", "programme"],
    ["/app/billing", "billing"],
    ["/app/settings/billing", "billing"],
    ["/app/settings", "settings"],
    ["/app/settings/dexcom/callback", "settings"],
    ["/app/support", "support"],
    ["/app/profile", "profile"],
  ];
  it.each(cases)("%s -> %s", (path, surface) => {
    expect(surfaceForPath(path)).toBe(surface);
  });
});

describe("canonical vocabulary", () => {
  it("uses only the approved state names", () => {
    const allowedNames = [
      "allowed",
      "grace",
      "restricted_billing",
      "restricted_deletion",
      "suspended_dispute",
    ];
    for (const make of Object.values(states)) {
      expect(allowedNames).toContain(make().state);
    }
  });

  it("names each state exactly as approved", () => {
    expect(states.allowed().state).toBe("allowed");
    expect(states.grace().state).toBe("grace");
    expect(states.restricted_billing().state).toBe("restricted_billing");
    expect(states.restricted_deletion().state).toBe("restricted_deletion");
  });
});

describe("account controls during restriction", () => {
  it("allowed and grace reach everything", () => {
    for (const ev of [states.allowed(), states.grace()]) {
      for (const s of ["programme", "billing", "settings", "support", "profile"] as Surface[]) {
        expect(surfaceAllowed(ev, s)).toBe(true);
      }
    }
  });

  it("restricted_billing keeps billing, settings, support and profile", () => {
    const ev = states.restricted_billing();
    expect(surfaceAllowed(ev, "programme")).toBe(false);
    for (const s of ["billing", "settings", "support", "profile"] as Surface[]) {
      expect(surfaceAllowed(ev, s)).toBe(true);
    }
  });

  it("restricted_deletion keeps settings and support only", () => {
    const ev = states.restricted_deletion();
    expect(surfaceAllowed(ev, "programme")).toBe(false);
    expect(surfaceAllowed(ev, "billing")).toBe(false);
    expect(surfaceAllowed(ev, "settings")).toBe(true);
    expect(surfaceAllowed(ev, "support")).toBe(true);
  });

  it("deletion restriction outranks any billing state", () => {
    const ev = evaluateSubscriptionRow(
      { status: "past_due", grace_started_at: LONG_AGO },
      NOW,
      { deletionRestricted: true },
    );
    expect(ev.state).toBe("restricted_deletion");
  });

  it("recovery never points at the sign-in page", () => {
    for (const make of Object.values(states)) {
      const to = recoveryPathFor(make().allowed_surfaces);
      expect(to.startsWith("/app/")).toBe(true);
      expect(to).not.toContain("login");
      // and the recovery target is itself reachable, so no redirect loop
      expect(surfaceAllowed(make(), surfaceForPath(to))).toBe(true);
    }
  });
});
