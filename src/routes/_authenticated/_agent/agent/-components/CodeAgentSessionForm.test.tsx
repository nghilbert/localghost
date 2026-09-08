import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodeAgentSessionForm } from "#/routes/_authenticated/_agent/agent/-components/CodeAgentSessionForm";
import { render } from "#/test/utils";

const { createMutateAsync, useEndpointModelGroups, useQuery } = vi.hoisted(() => ({
	createMutateAsync: vi.fn(),
	useEndpointModelGroups: vi.fn(),
	useQuery: vi.fn(),
}));

vi.mock("#/shared/domain/code-agent/use-sessions", () => ({
	useCreateCodeAgentSession: () => ({ mutateAsync: createMutateAsync }),
}));
// A `.functions` module drags TanStack Start's server entry into the browser bundle; the
// component only needs the query key, and `useQuery` is mocked anyway.
vi.mock("#/shared/domain/code-agent/code-agent.functions", () => ({
	codeAgentWorkspaceEntriesQueryOptions: (subpath: string) => ({
		queryKey: ["code-agent-workspace-entries", subpath],
		queryFn: () => ({ root: "", entries: [] }),
	}),
}));
vi.mock("#/routes/_authenticated/-hooks/use-endpoint-model-groups", () => ({
	useEndpointModelGroups,
}));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-query")>()),
	useQuery,
}));

// The create schema validates `endpointId` as a uuid, so these have to be real ones.
const ANTHROPIC_ID = "11111111-1111-4111-8111-111111111111";
const LLAMACPP_ID = "22222222-2222-4222-8222-222222222222";
const OPENAI_ID = "33333333-3333-4333-8333-333333333333";

const anthropic = {
	endpoint: { id: ANTHROPIC_ID, name: "Anthropic", provider: "anthropic" },
	models: ["claude-opus-5", "claude-sonnet-5"],
};
const llamacpp = {
	endpoint: { id: LLAMACPP_ID, name: "Local llama.cpp", provider: "llamacpp" },
	models: ["qwen3.5"],
};
// Claude Code speaks the Anthropic Messages API, so an OpenAI endpoint must not be offered.
const openai = {
	endpoint: { id: OPENAI_ID, name: "OpenAI", provider: "openai" },
	models: ["gpt-5"],
};

/** A two-level workspace tree, answered off the subpath in the query key. */
const TREE: Record<string, string[]> = { "": ["projects"], projects: ["localghost"] };

beforeEach(() => {
	vi.clearAllMocks();
	// Stands in for the real mutation, which runs the per-call `onSuccess` the form
	// routes to the new session with.
	createMutateAsync.mockImplementation(
		async (_value: unknown, options?: { onSuccess?: (data: { id: string }) => void }) => {
			options?.onSuccess?.({ id: "s1" });
			return { id: "s1" };
		},
	);
	useEndpointModelGroups.mockReturnValue({
		groups: [anthropic, llamacpp, openai],
		isLoading: false,
	});
	useQuery.mockImplementation(({ queryKey }: { queryKey: [string, string] }) => ({
		data: { root: "/home/nate", entries: TREE[queryKey[1]] ?? [] },
	}));
});

describe("CodeAgentSessionForm", () => {
	it("offers only endpoints whose protocol the harness speaks", async () => {
		const screen = await render(
			<CodeAgentSessionForm harnessId="claude-code" onCreated={vi.fn()} />,
		);

		await screen.getByTestId("endpointId-select").click();

		await expect
			.element(screen.getByTestId(`endpointId-option-${ANTHROPIC_ID}`))
			.toBeInTheDocument();
		await expect
			.element(screen.getByTestId(`endpointId-option-${LLAMACPP_ID}`))
			.toBeInTheDocument();
		expect(screen.getByTestId(`endpointId-option-${OPENAI_ID}`).elements()).toHaveLength(0);
	});

	it("replaces the model when the endpoint changes, so a stale pick cannot be submitted", async () => {
		const screen = await render(
			<CodeAgentSessionForm harnessId="claude-code" onCreated={vi.fn()} />,
		);

		await screen.getByTestId("endpointId-select").click();
		await screen.getByTestId(`endpointId-option-${LLAMACPP_ID}`).click();

		await screen.getByTestId("model-select").click();
		await expect.element(screen.getByTestId("model-option-qwen3.5")).toBeInTheDocument();
		expect(screen.getByTestId("model-option-claude-opus-5").elements()).toHaveLength(0);
	});

	it("submits the absolute path a folder click resolves to", async () => {
		const onCreated = vi.fn();
		const screen = await render(
			<CodeAgentSessionForm harnessId="claude-code" onCreated={onCreated} />,
		);

		await screen.getByTestId("workspace-entry-projects").click();
		await screen.getByTestId("firstMessage-input").fill("Summarize this repo.");
		await screen.getByTestId("code-agent-session-submit").click();

		await expect.poll(() => createMutateAsync.mock.calls.length).toBe(1);
		expect(createMutateAsync.mock.calls[0]?.[0]).toMatchObject({
			workspacePath: "/home/nate/projects",
			endpointId: ANTHROPIC_ID,
			harness: "claude-code",
			model: "claude-opus-5",
			firstMessage: "Summarize this repo.",
		});
		await expect.poll(() => onCreated.mock.calls.length).toBe(1);
	});

	it("composes a nested path from successive folder clicks", async () => {
		const screen = await render(
			<CodeAgentSessionForm harnessId="claude-code" onCreated={vi.fn()} />,
		);

		await screen.getByTestId("workspace-entry-projects").click();
		await screen.getByTestId("workspace-entry-localghost").click();
		await screen.getByTestId("firstMessage-input").fill("Go.");
		await screen.getByTestId("code-agent-session-submit").click();

		await expect.poll(() => createMutateAsync.mock.calls.length).toBe(1);
		expect(createMutateAsync.mock.calls[0]?.[0]).toMatchObject({
			workspacePath: "/home/nate/projects/localghost",
		});
	});

	// Clicking Home resolves to the workspace root itself, which the server refuses; the
	// form still has to send what was picked rather than a stale nested path.
	it("walks back to the root through the breadcrumb", async () => {
		const screen = await render(
			<CodeAgentSessionForm harnessId="claude-code" onCreated={vi.fn()} />,
		);

		await screen.getByTestId("workspace-entry-projects").click();
		await screen.getByTestId("workspace-crumb-home").click();
		await screen.getByTestId("firstMessage-input").fill("Go.");
		await screen.getByTestId("code-agent-session-submit").click();

		await expect.poll(() => createMutateAsync.mock.calls.length).toBe(1);
		expect(createMutateAsync.mock.calls[0]?.[0]).toMatchObject({ workspacePath: "/home/nate" });
	});

	it("explains itself when no saved endpoint speaks the harness's protocol", async () => {
		useEndpointModelGroups.mockReturnValue({ groups: [openai], isLoading: false });

		const screen = await render(
			<CodeAgentSessionForm harnessId="claude-code" onCreated={vi.fn()} />,
		);

		await expect
			.element(screen.getByTestId("field-endpointId"))
			.toHaveTextContent("No saved endpoint speaks Claude Code's protocol");
	});
});
