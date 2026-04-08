import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home page", () => {
  it("renders Phase 5 heading and sections", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /VinAgent Frontend MVP — Phase 5/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Scenario Planning/i)).toBeInTheDocument();
    expect(screen.getByText(/Trust & Recovery/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Metrics dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Demo presets/i })).toBeInTheDocument();
  });

  it("runs low-confidence path and asks for clarification", () => {
    render(<Home />);
    fireEvent.change(screen.getByRole("textbox", { name: /Ask VinAgent/i }), {
      target: { value: "help" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate plans/i }));
    expect(screen.getByText(/Low confidence detected/i)).toBeInTheDocument();
  });

  it("falls back to Plan B in failure scenario", () => {
    render(<Home />);
    fireEvent.change(screen.getByRole("textbox", { name: /Ask VinAgent/i }), {
      target: { value: "high risk" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate plans/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /Xác nhận Plan/i })[0]);
    expect(screen.getByText(/Plan B was activated/i)).toBeInTheDocument();
  });

  it("supports editable plan interactions", () => {
    render(<Home />);
    fireEvent.click(screen.getAllByRole("button", { name: /Editable Plan/i })[0]);
    expect(
      screen.getAllByText(/Break block - 30m recovery/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("blocks auto-action when guardrails are not met", () => {
    render(<Home />);
    fireEvent.change(screen.getByRole("textbox", { name: /Ask VinAgent/i }), {
      target: { value: "high risk stale" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate plans/i }));
    fireEvent.click(screen.getByRole("button", { name: /Auto-action: OFF/i }));
    expect(screen.getByText(/Auto-action blocked/i)).toBeInTheDocument();
  });

  it("allows acknowledging red flags", () => {
    render(<Home />);
    fireEvent.change(screen.getByRole("textbox", { name: /Ask VinAgent/i }), {
      target: { value: "high risk stale" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate plans/i }));
    fireEvent.click(screen.getByRole("button", { name: /Acknowledge flags/i }));
    expect(screen.getByText(/Flags acknowledged/i)).toBeInTheDocument();
  });

  it("runs preset scenario for failure demo", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /Failure fallback/i }));
    expect(screen.getByText(/Preset executed/i)).toBeInTheDocument();
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
