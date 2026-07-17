import { describe, expect, it } from "vitest";
import { parseCatalogHtml, parseTagsHtml } from "#/shared/domain/model/catalog.server";

// A trimmed but faithful slice of the ollama.com/library markup (2026 redesign,
// no machine hooks): a multi-size model with a capability, and an embedding
// model that has no size badges. A hookless nav item exercises the row guard.
const HTML = `
<ul role="list">
	<li><a href="/blog">Blog</a></li>
	<li>
		<a href="/library/llama3.2">
			<div title="llama3.2">
				<h2><div><span>llama3.2</span></div></h2>
				<p>Meta's Llama 3.2 goes small with 1B and 3B models.</p>
			</div>
			<div>
				<div>
					<span>tools</span>
					<span>1b</span>
					<span>3b</span>
				</div>
				<p>
					<span><svg></svg><span>74.7M</span><span>&nbsp;Pulls</span></span>
					<span><svg></svg><span>9</span><span>&nbsp;Tags</span></span>
					<span title="Sep 25, 2024 9:09 PM UTC"><svg></svg><span>Updated&nbsp;</span><span>1 year ago</span></span>
				</p>
			</div>
		</a>
	</li>
	<li>
		<a href="/library/nomic-embed-text">
			<div title="nomic-embed-text">
				<h2><div><span>nomic-embed-text</span></div></h2>
				<p>A high-performing open embedding model.</p>
			</div>
			<div>
				<div>
					<span>embedding</span>
				</div>
				<p>
					<span><svg></svg><span>76.6M</span><span>&nbsp;Pulls</span></span>
					<span title="Feb 21, 2024 5:26 PM UTC"><svg></svg><span>Updated&nbsp;</span><span>2 years ago</span></span>
				</p>
			</div>
		</a>
	</li>
</ul>
`;

describe("parseCatalogHtml", () => {
	const models = parseCatalogHtml(HTML);

	it("expands each size tag into its own pullable variant", () => {
		const ids = models.map((m) => m.id);
		expect(ids).toContain("llama3.2:1b");
		expect(ids).toContain("llama3.2:3b");
	});

	it("parses parameter count and capabilities, leaving size for enrichment", () => {
		const small = models.find((m) => m.id === "llama3.2:1b");
		expect(small?.paramB).toBe(1);
		expect(small?.sizeGb).toBeNull();
		expect(small?.contextK).toBeNull();
		expect(small?.capabilities).toEqual(["tools"]);
		expect(small?.tags).toContain("fast");
		expect(small?.pullCount).toBe("74.7M");
	});

	it("parses the exact update timestamp from the row title", () => {
		const small = models.find((m) => m.id === "llama3.2:1b");
		expect(small?.updated).toBe("1 year ago");
		expect(small?.updatedAt).toBe(new Date("Sep 25, 2024 9:09 PM UTC").toISOString());
	});

	it("parses to nothing when the markup has no model rows, triggering the scrape guard", () => {
		expect(parseCatalogHtml("<ul><li><a href='/blog'>Blog</a></li></ul>")).toEqual([]);
	});

	it("keeps a model with no size tags as a single bare-name entry", () => {
		const embed = models.filter((m) => m.name === "nomic-embed-text");
		expect(embed).toHaveLength(1);
		expect(embed[0]?.id).toBe("nomic-embed-text");
		expect(embed[0]?.paramB).toBeNull();
		expect(embed[0]?.capabilities).toEqual(["embedding"]);
	});
});

// A trimmed slice of an ollama.com/library/<name>/tags page: each row is a
// div.group with duplicate mobile/desktop links and a metadata text run.
const TAGS_HTML = `
<section>
	<div class="group px-4 py-3">
		<a href="/library/llama3.1:latest" class="md:hidden flex flex-col group">
			<span class="group-hover:underline">llama3.1:latest</span>
			<span><span class="font-mono">46e0c10c039e</span> • 4.9GB • 128K context window • Text input • 1 year ago</span>
		</a>
		<div class="hidden md:flex">
			<a href="/library/llama3.1:latest" class="group-hover:underline">llama3.1:latest</a>
			<span class="font-mono text-[11px]">46e0c10c039e</span>
		</div>
	</div>
	<div class="group px-4 py-3">
		<a href="/library/llama3.1:405b" class="md:hidden flex flex-col group">
			<span class="group-hover:underline">llama3.1:405b</span>
			<span><span class="font-mono">dbd6b9ea93de</span> • 243GB • 128K context window • Text input • 1 year ago</span>
		</a>
	</div>
	<div class="group px-4 py-3">
		<a href="/library/smol:135m" class="md:hidden flex flex-col group">
			<span class="group-hover:underline">smol:135m</span>
			<span><span class="font-mono">aabbccddeeff</span> • 92MB • 4K context window • Text input • 1 month ago</span>
		</a>
	</div>
	<a href="/library/llama3.1">back to model</a>
</section>
`;

describe("parseTagsHtml", () => {
	const tags = parseTagsHtml(TAGS_HTML);

	it("returns one entry per tag, collapsing mobile/desktop duplicate links", () => {
		expect(tags.map((t) => t.tag).sort()).toEqual(["135m", "405b", "latest"]);
	});

	it("parses digest, size, and context window from the row text", () => {
		const latest = tags.find((t) => t.tag === "latest");
		expect(latest?.digest).toBe("46e0c10c039e");
		expect(latest?.sizeGb).toBe(4.9);
		expect(latest?.contextK).toBe(128);
	});

	it("converts MB sizes to fractional GB", () => {
		const small = tags.find((t) => t.tag === "135m");
		expect(small?.sizeGb).toBeCloseTo(0.1);
		expect(small?.contextK).toBe(4);
	});

	it("ignores links without a tag", () => {
		expect(tags.some((t) => t.tag.includes("llama3.1"))).toBe(false);
	});
});
