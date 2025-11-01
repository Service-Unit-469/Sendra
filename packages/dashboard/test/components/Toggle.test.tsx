import { describe, expect, it, vi } from "vitest";
import Toggle from "../../src/components/Input/Toggle/Toggle";
import { render, screen, userEvent } from "../utils/test-helpers";

describe("Toggle Component", () => {
	it("renders title and description", () => {
		render(
			<Toggle title="Enable Feature" description="This enables a special feature" toggled={false} onToggle={vi.fn()} />,
		);

		expect(screen.getByText("Enable Feature")).toBeInTheDocument();
		expect(screen.getByText("This enables a special feature")).toBeInTheDocument();
	});

	it("shows toggle in off state", () => {
		render(<Toggle title="Test" description="Test description" toggled={false} onToggle={vi.fn()} />);

		const button = screen.getByRole("switch");
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("bg-neutral-200");
	});

	it("shows toggle in on state", () => {
		render(<Toggle title="Test" description="Test description" toggled={true} onToggle={vi.fn()} />);

		const button = screen.getByRole("switch");
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("bg-neutral-800");
	});

	it("calls onToggle when clicked", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();

		render(<Toggle title="Test" description="Test description" toggled={false} onToggle={onToggle} />);

		const button = screen.getByRole("switch");
		await user.click(button);

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("applies disabled styling when disabled", () => {
		render(<Toggle title="Test" description="Test description" toggled={false} onToggle={vi.fn()} disabled={true} />);

		const title = screen.getByText("Test");
		const description = screen.getByText("Test description");

		expect(title).toHaveClass("text-neutral-400");
		expect(description).toHaveClass("text-neutral-300");
	});

	it("does not apply disabled styling when not disabled", () => {
		render(<Toggle title="Test" description="Test description" toggled={false} onToggle={vi.fn()} disabled={false} />);

		const title = screen.getByText("Test");
		const description = screen.getByText("Test description");

		expect(title).toHaveClass("text-neutral-800");
		expect(description).toHaveClass("text-neutral-500");
	});

	it("applies custom className", () => {
		render(
			<Toggle
				title="Test"
				description="Test description"
				toggled={false}
				onToggle={vi.fn()}
				className="custom-class"
			/>,
		);

		const container = screen.getByText("Test").parentElement?.parentElement;
		expect(container).toHaveClass("custom-class");
	});

	it("button has correct accessibility attributes", () => {
		render(<Toggle title="Test Feature" description="Test description" toggled={true} onToggle={vi.fn()} />);

		const button = screen.getByRole("switch");
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("aria-checked");
		expect(button).toHaveAttribute("aria-labelledby");
		expect(button).toHaveAttribute("aria-describedby");
	});
});

