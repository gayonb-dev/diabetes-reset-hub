import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuickStats from "@/components/dashboard/QuickStats";
import { classifyGlucose, glucoseTone, GLUCOSE_STATUS_LABEL, GlucoseStatus } from "@/lib/glucose";

const toneClass: Record<string, string> = {
  normal: "text-status-normal",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

function renderStat(mgdl: number) {
  const status: GlucoseStatus = classifyGlucose(mgdl, "fasting");
  const { unmount } = render(
    <MemoryRouter>
      <QuickStats
        stats={[
          {
            label: "Blood Sugar",
            value: String(mgdl),
            unit: "mg/dL",
            tone: glucoseTone(status),
            statusLabel: GLUCOSE_STATUS_LABEL[status],
          },
        ]}
      />
    </MemoryRouter>,
  );
  return { status, unmount };
}

describe("QuickStats renders classifier tone and label for glucose", () => {
  const cases: [number, GlucoseStatus][] = [
    [45, "urgent_low"],
    [60, "low"],
    [95, "in_range"],
    [110, "elevated"],
    [180, "high"],
  ];

  for (const [mgdl, expected] of cases) {
    it(`${mgdl} mg/dL fasting renders as ${expected}`, () => {
      const { status, unmount } = renderStat(mgdl);
      expect(status).toBe(expected);
      const label = screen.getByText(GLUCOSE_STATUS_LABEL[expected]);
      expect(label).toBeInTheDocument();
      expect(label.className).toContain(toneClass[glucoseTone(expected)]);
      unmount();
    });
  }

  it('never renders the word "Normal"', () => {
    const { unmount } = renderStat(95);
    expect(screen.getByText("In range")).toBeInTheDocument();
    expect(screen.queryByText("Normal")).toBeNull();
    unmount();
  });
});
