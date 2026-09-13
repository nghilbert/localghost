import { describe, expect, it, vi } from "vitest";
import { render } from "#/test/utils";
import { CommandApprovalMarker } from "./CommandApprovalMarker";

describe("CommandApprovalMarker", () => {
	it("offers Allow for a grantable command approval", async () => {
		const screen = await render(
			<CommandApprovalMarker
				approval={{ approvalId: "claude-code:command:npm test", title: "npm test" }}
				disabled={false}
				onApprove={vi.fn()}
				onDeny={vi.fn()}
			/>,
		);
		await expect.element(screen.getByTestId("command-approval-approve")).toBeInTheDocument();
	});

	it("hides Allow for an approval kind with no grant path", async () => {
		const screen = await render(
			<CommandApprovalMarker
				approval={{ approvalId: "claude-code:tool:Read", title: "Read" }}
				disabled={false}
				onApprove={vi.fn()}
				onDeny={vi.fn()}
			/>,
		);
		await expect.element(screen.getByTestId("command-approval-approve")).not.toBeInTheDocument();
		await expect.element(screen.getByText("Can't be allowed from here")).toBeInTheDocument();
	});
});
