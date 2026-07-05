import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModelPicker } from "#/features/chat/components/ChatInput/ModelPicker";
import { render, screen } from "#/test/utils";

const endpoints = [
	{ id: "e1", name: "Local" },
	{ id: "e2", name: "Cloud" },
];

vi.mock("#/features/endpoints/hooks/use-endpoints", () => ({
	useEndpoints: () => ({ endpoints }),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-router")>()),
	Link: ({
		children,
		to,
		...props
	}: React.ComponentProps<"a"> & { children?: React.ReactNode; to: string }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

const { useQueriesMock } = vi.hoisted(() => ({ useQueriesMock: vi.fn() }));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-query")>()),
	useQueries: useQueriesMock,
}));

async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByTestId("model-picker-trigger"));
	// Base UI opens the menu on the next animation frame, after userEvent's click resolves.
	return screen.findByTestId("model-picker-menu");
}

describe("ModelPicker dropdown", () => {
	it("groups each endpoint with its resolved models, in order", async () => {
		useQueriesMock.mockReturnValue([
			{ data: ["llama3", "phi3"], isLoading: false, isError: false },
			{ data: ["gpt-4o"], isLoading: false, isError: false },
		]);
		const user = userEvent.setup();
		render(<ModelPicker selection={null} />);
		await openDropdown(user);

		expect(screen.getByTestId("model-group-e1")).toHaveTextContent("Local");
		expect(screen.getByTestId("model-group-e2")).toHaveTextContent("Cloud");
		expect(screen.getByTestId("model-item-e1-llama3")).toBeInTheDocument();
		expect(screen.getByTestId("model-item-e1-phi3")).toBeInTheDocument();
		expect(screen.getByTestId("model-item-e2-gpt-4o")).toBeInTheDocument();
	});

	it("drops endpoints with no models and treats a missing result as empty", async () => {
		useQueriesMock.mockReturnValue([{ data: [], isLoading: false, isError: false }]);
		const user = userEvent.setup();
		render(<ModelPicker selection={null} />);
		await openDropdown(user);

		expect(screen.getByTestId("model-picker-notice")).toHaveTextContent("Browse the Library");
	});
});
