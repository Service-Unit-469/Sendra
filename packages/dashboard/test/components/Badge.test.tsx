import { describe, expect, it } from "vitest";
import Badge from "../../src/components/Badge/Badge";
import { render, screen } from "../utils/test-helpers";

describe("Badge Component", () => {
	it("renders with default info type", () => {
		render(<Badge type="info">Info Badge</Badge>);

		const badge = screen.getByText("Info Badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("bg-blue-100", "text-blue-800");
	});

	it("renders with danger type styling", () => {
		render(<Badge type="danger">Error</Badge>);

		const badge = screen.getByText("Error");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("bg-red-100", "text-red-800");
	});

	it("renders with warning type styling", () => {
		render(<Badge type="warning">Warning</Badge>);

		const badge = screen.getByText("Warning");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("bg-yellow-100", "text-yellow-800");
	});

	it("renders with success type styling", () => {
		render(<Badge type="success">Success</Badge>);

		const badge = screen.getByText("Success");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("bg-green-100", "text-green-800");
	});

	it("renders with purple type styling", () => {
		render(<Badge type="purple">Custom</Badge>);

		const badge = screen.getByText("Custom");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("bg-purple-100", "text-purple-800");
	});

	it("renders children text correctly", () => {
		render(<Badge type="info">Test Badge Text</Badge>);

		expect(screen.getByText("Test Badge Text")).toBeInTheDocument();
	});

	it("applies base styling classes", () => {
		render(<Badge type="info">Badge</Badge>);

		const badge = screen.getByText("Badge");
		expect(badge).toHaveClass("inline-flex", "items-center", "px-2", "py-0.5", "rounded-sm", "text-xs", "font-medium");
	});
});

