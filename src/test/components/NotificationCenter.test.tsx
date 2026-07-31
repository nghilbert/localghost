import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "#/shared/components/ui/sidebar";
import type { PullProgress } from "#/shared/domain/model/types";
import { render } from "#/test/utils";

const { fetchLibraryStatus, stopMock } = vi.hoisted(() => ({
	fetchLibraryStatus: vi.fn(),
	stopMock: vi.fn(),
}));

vi.mock("#/shared/domain/model/use-model-download", () => ({
	useModelDownload: () => ({ pulling: {}, pull: vi.fn(), stop: stopMock }),
}));

vi.mock("#/shared/domain/model/use-model-download-events", () => ({
	useModelDownloadEvents: vi.fn(),
}));

vi.mock("#/shared/domain/model/model.functions", () => ({
	libraryStatusQueryOptions: () => ({
		queryKey: ["library-status"],
		queryFn: () => fetchLibraryStatus(),
	}),
}));

const { NotificationCenter } = await import(
	"#/routes/_authenticated/-components/AppSidebar/NotificationCenter"
);

function withDownloads(downloads: Record<string, PullProgress>) {
	fetchLibraryStatus.mockResolvedValue({ found: true, endpointId: "endpoint-1", downloads });
}

function renderCenter() {
	return render(
		<SidebarProvider>
			<NotificationCenter />
		</SidebarProvider>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	withDownloads({});
});

describe("NotificationCenter", () => {
	it("renders nothing when there are no in-flight downloads", async () => {
		const screen = await renderCenter();

		await expect.element(screen.getByTestId("notification-center-trigger")).not.toBeInTheDocument();
	});

	it("lists one item per in-flight pull, with a spinner while the total is unknown", async () => {
		withDownloads({
			"llama3.1:8b": { status: "Downloading", completed: 50, total: 100 },
			"qwen2.5:7b": { status: "Downloading" },
		});
		const screen = await renderCenter();

		await screen.getByTestId("notification-center-trigger").click();

		const items = screen.getByTestId("notification-item");
		await expect.poll(() => items.all().length).toBe(2);
		await expect.element(items.first()).toHaveTextContent("50% · 50 B / 100 B");
		// No total yet, so the bar stays indeterminate rather than sitting at zero.
		await expect.element(items.last().getByRole("status")).toBeInTheDocument();
	});

	it("stops a pull by the model it was rendered for", async () => {
		withDownloads({ "llama3.1:8b": { status: "Downloading" } });
		const screen = await renderCenter();

		await screen.getByTestId("notification-center-trigger").click();
		await screen.getByTestId("notification-stop-button").click();

		expect(stopMock).toHaveBeenCalledWith("llama3.1:8b");
	});
});
