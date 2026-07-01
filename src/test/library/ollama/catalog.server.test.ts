import { describe, expect, it } from "vitest";
import { parseCatalogHtml } from "#/features/library/lib/ollama/catalog.server";

// A trimmed but faithful slice of the ollama.com/library markup: a multi-size
// model with a capability, and an embedding model that has no size tags.
const HTML = `
<ul>
	<li x-test-model>
		<a href="/library/llama3.2">
			<div x-test-model-title title="llama3.2">
				<span>llama3.2</span>
				<p>Meta's Llama 3.2 goes small with 1B and 3B models.</p>
			</div>
			<span x-test-capability>tools</span>
			<span x-test-size>1b</span>
			<span x-test-size>3b</span>
			<span class="flex items-center" title="Sep 25, 2024 9:09 PM UTC">
				<span x-test-pull-count>74.7M</span>
				<span x-test-updated>1 year ago</span>
			</span>
		</a>
	</li>
	<li x-test-model>
		<a href="/library/nomic-embed-text">
			<div x-test-model-title title="nomic-embed-text">
				<span>nomic-embed-text</span>
				<p>A high-performing open embedding model.</p>
			</div>
			<span x-test-capability>embedding</span>
			<span class="flex items-center" title="Feb 21, 2024 5:26 PM UTC">
				<span x-test-pull-count>76.6M</span>
				<span x-test-updated>2 years ago</span>
			</span>
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

	it("parses parameter count, footprint, and capabilities", () => {
		const small = models.find((m) => m.id === "llama3.2:1b");
		expect(small?.paramB).toBe(1);
		expect(small?.vramGb).toBeGreaterThan(0);
		expect(small?.capabilities).toEqual(["tools"]);
		expect(small?.tags).toContain("fast");
		expect(small?.pullCount).toBe("74.7M");
	});

	it("parses the exact update timestamp from the row title", () => {
		const small = models.find((m) => m.id === "llama3.2:1b");
		expect(small?.updated).toBe("1 year ago");
		expect(small?.updatedAt).toBe(new Date("Sep 25, 2024 9:09 PM UTC").toISOString());
	});

	it("keeps a model with no size tags as a single bare-name entry", () => {
		const embed = models.filter((m) => m.name === "nomic-embed-text");
		expect(embed).toHaveLength(1);
		expect(embed[0]?.id).toBe("nomic-embed-text");
		expect(embed[0]?.paramB).toBeNull();
		expect(embed[0]?.capabilities).toEqual(["embedding"]);
	});
});
