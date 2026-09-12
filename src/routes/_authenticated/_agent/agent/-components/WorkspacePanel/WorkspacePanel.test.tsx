import { describe, expect, it, vi } from "vitest";
import { WorkspacePanel } from "#/routes/_authenticated/_agent/agent/-components/WorkspacePanel";
import { render } from "#/test/utils";

/** A two-level workspace tree, answered off the absolute path each query is keyed on. */
const TREE: Record<string, { name: string; kind: "directory" | "file" }[]> = {
	"/home/nate/project": [
		{ name: "src", kind: "directory" },
		{ name: "README.md", kind: "file" },
	],
	"/home/nate/project/src": [{ name: "index.ts", kind: "file" }],
};

vi.mock("#/shared/domain/code-agent/code-agent.functions", () => ({
	codeAgentWorkspaceEntriesQueryOptions: (subpath: string) => ({
		queryKey: ["code-agent-workspace-entries", subpath],
		queryFn: () => ({ root: "/home/nate", subpath, entries: TREE[subpath] ?? [] }),
	}),
}));

describe("WorkspacePanel", () => {
	it("lists the workspace root and expands a directory to reveal its children", async () => {
		const screen = await render(<WorkspacePanel workspacePath="/home/nate/project" />);

		await expect.element(screen.getByText("src")).toBeInTheDocument();
		await expect.element(screen.getByText("README.md")).toBeInTheDocument();
		expect(screen.getByText("index.ts").elements()).toHaveLength(0);

		await screen.getByTestId("workspace-tree-toggle-src").click();

		await expect.element(screen.getByText("index.ts")).toBeInTheDocument();
	});
});
