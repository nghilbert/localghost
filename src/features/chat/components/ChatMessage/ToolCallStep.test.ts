import { describe, expect, it } from "vitest";
import { pageTitle, toolLabels, urlLabel } from "./ToolCallStep";

const base = { type: "tool-call", id: "c1", arguments: "{}", state: "input-complete" } as const;

describe("toolLabels", () => {
	it("names the query for web_search", () => {
		const labels = toolLabels({ ...base, name: "web_search", input: { query: "otter facts" } }, "");
		for (const phase of ["running", "done", "failed"] as const) {
			expect(labels[phase]).toContain('"otter facts"');
		}
	});

	it("falls back without a query", () => {
		const labels = toolLabels({ ...base, name: "web_search" }, "");
		expect(labels.running).not.toContain('"');
	});

	it("names the page for read_url, and its title once read", () => {
		const input = { url: "https://www.example.com/a/b/" };
		expect(toolLabels({ ...base, name: "read_url", input }, "").running).toContain(
			"example.com/a/b",
		);
		expect(toolLabels({ ...base, name: "read_url", input }, "# Otters\n\nText").done).toContain(
			'"Otters"',
		);
	});

	it("labels each memory action differently", () => {
		const running = (["add", "search", "list"] as const).map(
			(action) => toolLabels({ ...base, name: "manage_memory", input: { action } }, "").running,
		);
		expect(new Set(running).size).toBe(running.length);
	});

	it("asks for approval only before deleting a memory", () => {
		expect(
			toolLabels({ ...base, name: "delete_memory", input: { id: "m1" } }, "").approval,
		).toBeDefined();
		expect(toolLabels({ ...base, name: "web_search" }, "").approval).toBeUndefined();
	});
});

describe("urlLabel", () => {
	it("drops www. and a trailing slash", () => {
		expect(urlLabel("https://www.example.com/")).toBe("example.com");
	});

	it("cuts a long path", () => {
		const label = urlLabel(`https://example.com/${"a".repeat(80)}`);
		expect(label).toHaveLength(40);
		expect(label?.endsWith("…")).toBe(true);
	});

	it("is null for a missing or malformed URL", () => {
		expect(urlLabel(undefined)).toBeNull();
		expect(urlLabel("not a url")).toBeNull();
	});
});

describe("pageTitle", () => {
	it("reads the first heading", () => {
		expect(pageTitle("# Job Outlook 2026\n\nBody")).toBe("Job Outlook 2026");
	});

	it("is null when the heading is only the URL, or there is none", () => {
		expect(pageTitle("# https://example.com\n\nBody")).toBeNull();
		expect(pageTitle("No readable content found at that URL.")).toBeNull();
	});
});
