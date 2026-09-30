import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "#/components/ui/sidebar";
import type { PullProgress } from "#/features/library/library.types";
import { render } from "#/test/utils";

const { pullingMock, stopMock } = vi.hoisted(() => ({
	pullingMock: vi.fn(),
	stopMock: vi.fn(),
}));

vi.mock("#/features/library/hooks/use-model-download", () => ({
	useModelDownload: () => ({ pulling: pullingMock(), pull: vi.fn(), stop: stopMock }),
}));

const { NotificationCenter } = await import("./NotificationCenter");

/** The merged map the sidebar reads, streamed byte counts already folded in. */
function withDownloads(pulling: Record<string, PullProgress>) {
	pullingMock.mockReturnValue(pulling);
}

function renderCenter() {
	return render(
		<Sidebar.Provider>
			<NotificationCenter />
		</Sidebar.Provider>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	withDownloads({});
});

describe("NotificationCenter", () => {
	it("renders nothing when there are no in-flight downloads", async () => {
		const screen = await renderCenter();

		await expect.element(screen.getByRole("button", { name: "Downloads" })).not.toBeInTheDocument();
	});

	it("lists one item per in-flight pull, with a spinner while the total is unknown", async () => {
		withDownloads({
			"llama3.1:8b": { status: "Downloading", completed: 50, total: 100 },
			"qwen2.5:7b": { status: "Downloading" },
		});
		const screen = await renderCenter();

		await screen.getByRole("button", { name: "Downloads" }).click();

		const items = screen.getByRole("list", { name: "In-flight downloads" }).getByRole("listitem");
		await expect.poll(() => items.all().length).toBe(2);
		await expect.element(items.first()).toHaveTextContent("50% · 50 / 100 B");
		// No total yet, so the bar stays indeterminate rather than sitting at zero.
		await expect
			.element(items.last().getByRole("progressbar"))
			.not.toHaveAttribute("aria-valuenow");
	});

	it("stops a pull by the model it was rendered for", async () => {
		withDownloads({ "llama3.1:8b": { status: "Downloading" } });
		const screen = await renderCenter();

		await screen.getByRole("button", { name: "Downloads" }).click();
		await screen.getByRole("button", { name: "Stop downloading llama3.1:8b" }).click();

		expect(stopMock).toHaveBeenCalledWith("llama3.1:8b");
	});
});
