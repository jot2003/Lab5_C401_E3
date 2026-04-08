import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home page", () => {
  it("renders Phase 1 heading and sections", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /VinAgent UI Foundation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Scenario Planning/i)).toBeInTheDocument();
    expect(screen.getByText(/Trust & Recovery/i)).toBeInTheDocument();
  });

  it("renders plan cards and recovery controls", () => {
    render(<Home />);
    expect(screen.getByText(/Plan A — Optimized/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan B — Backup/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Escalate to Advisor/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("passes accessibility smoke test", async () => {
    const { container } = render(<Home />);
    const results = await axe(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    const blockingViolations = results.violations.filter((violation) =>
      violation.nodes.some((node) =>
        ["critical", "serious"].includes(node.impact ?? ""),
      ),
    );
    expect(blockingViolations).toHaveLength(0);
  });
});
