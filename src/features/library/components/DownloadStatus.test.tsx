import { describe, expect, it } from "vitest";
import { render } from "#/test/utils";
import { DownloadStatus } from "./DownloadStatus";

describe("DownloadStatus", () => {
	it("shows an indeterminate bar until llama.cpp reports byte counts", async () => {
		const screen = await render(<DownloadStatus pullState={{ status: "Downloading" }} />);

		const bar = screen.getByRole("progressbar", { name: "Model download progress" });
		await expect.element(bar).toBeInTheDocument();
		await expect.element(bar).not.toHaveAttribute("aria-valuenow");
		await expect.element(screen.getByText("Starting download")).toBeInTheDocument();
	});

	it("shows a determinate bar and the byte detail once counts arrive", async () => {
		const screen = await render(
			<DownloadStatus pullState={{ status: "Downloading", completed: 30, total: 120 }} />,
		);

		await expect
			.element(screen.getByRole("progressbar", { name: "Model download progress" }))
			.toHaveAttribute("aria-valuenow", "25");
		await expect.element(screen.getByText("25% · 30 / 120 B")).toBeInTheDocument();
	});
});
