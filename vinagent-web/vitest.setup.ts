import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("react-resizable-panels", () => ({
	Group: ({ children, className }: { children: React.ReactNode; className?: string }) =>
		React.createElement("div", { className }, children),
	Panel: ({ children }: { children: React.ReactNode }) =>
		React.createElement("div", null, children),
	Separator: ({ className }: { className?: string }) =>
		React.createElement("div", { className, "data-testid": "panel-separator" }),
}));
