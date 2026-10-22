import { http, HttpResponse } from "msw";
import { describe, expect } from "vitest";
import { page } from "vitest/browser";
import { useImportBackup } from "#/features/backup/hooks/use-import-backup";
import { it, worker } from "#/test/msw";
import { renderHook } from "#/test/utils";

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

		const toast = page.getByRole("dialog", { name: "Backup imported" });
		await expect.element(toast).toBeVisible();
		expect(uploaded).toBe('{"version":3}');
		await expect
			.element(toast)
			.toMatchTextContent("3 memories and 2 conversations added; 4 duplicates");
		// Endpoints arrive without their keys, so the summary has to say so.
		await expect.element(toast).toMatchTextContent("re-enter their API keys");
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

		await expect
			.element(page.getByRole("dialog", { name: "Failed to import backup" }))
			.toMatchTextContent("Unsupported backup version");
	});
});
