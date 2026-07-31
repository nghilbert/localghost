import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { worker } from "#/test/msw";
import { renderHook } from "#/test/utils";

const { toastSuccess, toastError } = vi.hoisted(() => ({
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const { useImportBackup } = await import(
	"#/routes/_authenticated/settings/-hooks/use-import-backup"
);

function importedCounts(overrides: Record<string, number> = {}) {
	return {
		memories: 0,
		conversations: 0,
		endpoints: 0,
		modelSettings: 0,
		skippedMemories: 0,
		skippedConversations: 0,
		skippedEndpoints: 0,
		skippedModelSettings: 0,
		invalidConversations: 0,
		...overrides,
	};
}

function backupFile(contents: object) {
	return new File([JSON.stringify(contents)], "backup.json", { type: "application/json" });
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("useImportBackup", () => {
	it("uploads the file's text and summarizes the counts the endpoint reports", async () => {
		let uploaded: string | undefined;
		worker.use(
			http.post("/api/backup/import", async ({ request }) => {
				uploaded = await request.text();
				return HttpResponse.json({
					imported: importedCounts({
						memories: 3,
						conversations: 2,
						endpoints: 1,
						skippedMemories: 4,
					}),
				});
			}),
		);
		const { result } = await renderHook(() => useImportBackup());

		result.current.mutate(backupFile({ version: 3 }));

		await expect.poll(() => toastSuccess.mock.calls.length).toBe(1);
		expect(uploaded).toBe('{"version":3}');
		const [title, options] = toastSuccess.mock.lastCall ?? [];
		expect(title).toBe("Backup imported");
		expect(options?.description).toContain("3 memories and 2 conversations added; 4 duplicates");
		// Endpoints arrive without their keys, so the summary has to say so.
		expect(options?.description).toContain("re-enter their API keys");
	});

	it("reports the server's message when the import is rejected", async () => {
		worker.use(
			http.post(
				"/api/backup/import",
				() =>
					new HttpResponse("Unsupported backup version", {
						status: 400,
					}),
			),
		);
		const { result } = await renderHook(() => useImportBackup());

		result.current.mutate(backupFile({ version: 99 }));

		await expect.poll(() => toastError.mock.calls.length).toBe(1);
		expect(toastError.mock.lastCall?.[1]?.description).toBe("Unsupported backup version");
		expect(toastSuccess).not.toHaveBeenCalled();
	});
});
