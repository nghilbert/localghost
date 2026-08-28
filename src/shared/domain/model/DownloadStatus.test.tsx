import { describe, expect, it } from "vitest";
import { DownloadStatus } from "#/shared/domain/model/DownloadStatus";
import { render } from "#/test/utils";

describe("DownloadStatus", () => {
	it("spins with no detail line until llama.cpp reports byte counts", async () => {
		const screen = await render(<DownloadStatus pullState={{ status: "Downloading" }} />);

		await expect.element(screen.getByTestId("download-status-spinner")).toBeInTheDocument();
		expect(screen.getByTestId("download-status-progress").elements()).toHaveLength(0);
		expect(screen.getByTestId("download-status-detail").elements()).toHaveLength(0);
	});

	it("shows a determinate bar and the byte detail once counts arrive", async () => {
		const screen = await render(
			<DownloadStatus pullState={{ status: "Downloading", completed: 30, total: 120 }} />,
		);

		await expect
			.element(screen.getByTestId("download-status-progress"))
			.toHaveAttribute("aria-valuenow", "25");
		await expect
			.element(screen.getByTestId("download-status-detail"))
			.toHaveTextContent("25% · 30 B / 120 B");
		expect(screen.getByTestId("download-status-spinner").elements()).toHaveLength(0);
	});
});
