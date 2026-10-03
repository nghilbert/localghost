import { afterEach, describe, expect, it, vi } from "vitest";
import { readUrl } from "#/features/chat/server/read-url.server";
import { UnsafeUrlError } from "#/lib/ssrf-guard.server";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("undici", async (importOriginal) => {
	const actual = await importOriginal<typeof import("undici")>();
	return { ...actual, fetch: fetchMock };
});

const ARTICLE_HTML = `<!doctype html>
<html>
	<head><title>Test Article</title></head>
	<body>
		<nav>Home About Contact</nav>
		<article>
			<h1>Test Article</h1>
			<p>This is the main body of the article with enough text to be treated as the
			primary content of the page by the readability extractor.</p>
			<p>A second paragraph adds more substance so the extractor keeps it.</p>
		</article>
		<footer>Copyright</footer>
	</body>
</html>`;

/** A minimal `fetch` Response stand-in with a real `Headers` for redirect checks. */
function mockResponse(init: { ok: boolean; status?: number; text?: () => Promise<string> }) {
	return { ...init, headers: new Headers() };
}

describe("readUrl", () => {
	afterEach(() => {
		fetchMock.mockReset();
	});

	it("extracts the main content as text", async () => {
		fetchMock.mockResolvedValue(mockResponse({ ok: true, text: async () => ARTICLE_HTML }));

		const result = await readUrl("https://example.com/article");
		expect(result).toContain("Test Article");
		expect(result).toContain("main body of the article");
		expect(result).toContain("second paragraph");
	});

	it("throws with the status on HTTP error", async () => {
		fetchMock.mockResolvedValue(mockResponse({ ok: false, status: 404 }));
		await expect(readUrl("https://example.com/missing")).rejects.toThrow(
			"Failed to read page: HTTP 404",
		);
	});

	it("throws with the cause when fetch throws", async () => {
		fetchMock.mockRejectedValue(new Error("boom"));
		await expect(readUrl("https://example.com")).rejects.toThrow("Failed to read page: boom");
	});

	it("aborts the fetch when the caller's signal aborts", async () => {
		fetchMock.mockResolvedValue(mockResponse({ ok: false, status: 404 }));
		const controller = new AbortController();
		controller.abort();
		await expect(readUrl("https://example.com", controller.signal)).rejects.toThrow();
		expect(fetchMock.mock.calls[0]?.[1]?.signal.aborted).toBe(true);
	});

	it("rejects a private literal IP without fetching", async () => {
		await expect(readUrl("http://127.0.0.1/admin")).rejects.toThrow(
			"Refusing to fetch a local or private network address.",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("surfaces the guard message when the connector rejects a rebinding host", async () => {
		// undici wraps connect-time errors: the guard's error sits in the cause chain.
		const unsafe = new UnsafeUrlError("Refusing to fetch a local or private network address.");
		fetchMock.mockRejectedValue(new TypeError("fetch failed", { cause: unsafe }));
		await expect(readUrl("https://rebinder.example.com/")).rejects.toThrow(
			"Refusing to fetch a local or private network address.",
		);
	});
});
