import { describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "#/routes/_authenticated/-components/AppSidebar/NotificationCenter";
import { SidebarProvider } from "#/shared/components/ui/sidebar";
import { render } from "#/test/utils";

type PullFixture = {
	model: string;
	status: string;
	completed?: number;
	total?: number;
	bytesPerSec?: number;
	done: boolean;
};

const { activePulls, stopMock } = vi.hoisted(() => {
	const activePulls: PullFixture[] = [];
	return { activePulls, stopMock: vi.fn() };
});

vi.mock("#/shared/domain/model/use-model-download", () => ({
	useModelDownload: () => ({ pulling: {}, pull: vi.fn(), stop: stopMock, dismiss: vi.fn() }),
}));

vi.mock("#/shared/domain/model/model.functions", () => ({
	activeDownloadsQueryOptions: () => ({ queryKey: ["library", "active-downloads"] }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-query")>()),
	useQuery: () => ({ data: activePulls }),
}));

function renderCenter() {
	return render(
		<SidebarProvider>
			<NotificationCenter />
		</SidebarProvider>,
	);
}

describe("NotificationCenter", () => {
	it("renders nothing when there are no in-flight downloads", async () => {
		activePulls.length = 0;
		const screen = await renderCenter();

		await expect.element(screen.getByTestId("notification-center-trigger")).not.toBeInTheDocument();
	});

	it("shows a trigger and lists each in-flight pull once opened", async () => {
		activePulls.length = 0;
		activePulls.push(
			{ model: "llama3.1:8b", status: "downloading", completed: 50, total: 100, done: false },
			{ model: "qwen2.5:7b", status: "downloading", done: false },
			{ model: "mistral:7b", status: "success", done: true },
		);
		const screen = await renderCenter();

		await expect.element(screen.getByTestId("notification-center-trigger")).toBeInTheDocument();
		await screen.getByTestId("notification-center-trigger").click();

		const items = screen.getByTestId("notification-item");
		await expect.poll(() => items.all().length).toBe(2);
	});

	it("stops a pull when its stop button is clicked", async () => {
		activePulls.length = 0;
		activePulls.push({ model: "llama3.1:8b", status: "downloading", done: false });
		stopMock.mockClear();
		const screen = await renderCenter();

		await screen.getByTestId("notification-center-trigger").click();
		await screen.getByTestId("notification-stop-button").click();

		expect(stopMock).toHaveBeenCalledWith("llama3.1:8b");
	});
});
