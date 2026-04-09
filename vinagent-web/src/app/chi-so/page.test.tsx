import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MetricsPage from "./page";

describe("Metrics page", () => {
  it("renders metrics dashboard content", () => {
    render(<MetricsPage />);
    expect(screen.getByRole("heading", { name: /Bảng chỉ số vận hành/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Độ chính xác xếp lịch/i)).toBeInTheDocument();
    expect(screen.getByText(/Tỷ lệ kích hoạt Plan B/i)).toBeInTheDocument();
  });
});
