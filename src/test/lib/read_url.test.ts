import { afterEach, describe, expect, it, vi } from "vitest";
import { readUrl } from "#/lib/tools/read_url";

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

describe("readUrl", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("extracts the main content as text", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => ARTICLE_HTML }));

		const result = await readUrl("https://example.com/article");
		expect(result).toContain("Test Article");
		expect(result).toContain("main body of the article");
		expect(result).toContain("second paragraph");
	});

	it("returns a friendly message on HTTP error", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
		const result = await readUrl("https://example.com/missing");
		expect(result).toBe("Failed to fetch page: HTTP 404");
	});

	it("returns a friendly message when fetch throws", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
		const result = await readUrl("https://example.com");
		expect(result).toContain("Failed to read page");
		expect(result).toContain("boom");
	});
});
