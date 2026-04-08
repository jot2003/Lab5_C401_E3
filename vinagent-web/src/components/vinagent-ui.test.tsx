import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";

import {
  ClarificationCard,
  ConfidenceBadge,
  PlanCard,
  PromptInput,
  ReasoningPanel,
  Toast,
} from "./vinagent-ui";

describe("VinAgent UI components", () => {
  it("renders prompt input and button", () => {
    render(<PromptInput />);
    expect(screen.getByPlaceholderText(/Lên lịch HK Xuân/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Generate plans/i }),
    ).toBeInTheDocument();
  });

  it("renders high and low confidence labels", () => {
    const { rerender } = render(<ConfidenceBadge level="high" />);
    expect(screen.getByText(/High confidence/i)).toBeInTheDocument();
    rerender(<ConfidenceBadge level="low" />);
    expect(screen.getByText(/Low confidence/i)).toBeInTheDocument();
  });

  it("renders plan card content and actions", () => {
    render(
      <PlanCard
        title="Plan A"
        confidence="medium"
        courses={["CECS101", "CECS204"]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Plan A" })).toBeInTheDocument();
    expect(screen.getByText("CECS101")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xác nhận Plan/i })).toBeInTheDocument();
  });

  it("renders trust recovery cards", () => {
    render(
      <>
        <ReasoningPanel reasons={["Ly do 1", "Ly do 2"]} />
        <ClarificationCard />
        <Toast title="Done" message="Message" />
      </>,
    );
    expect(screen.getByText(/Showing work/i)).toBeInTheDocument();
    expect(screen.getByText(/Need clarification/i)).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("passes accessibility smoke test", async () => {
    const { container } = render(
      <>
        <PromptInput />
        <PlanCard
          title="Plan A"
          confidence="high"
          courses={["CECS101", "CECS204"]}
        />
      </>,
    );
    const results = await axe(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    expect(results.violations).toHaveLength(0);
  });
});
