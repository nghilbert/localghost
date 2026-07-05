// PostToolUse hook on Edit|Write: flags testing anti-patterns in the text a tool call
// added to a src/test file, then feeds the hits back to Claude (exit 2; the edit stands).
// Enforces the repo's stated-but-unenforced test rules (userEvent over fireEvent, no casts,
// honest narrowing, query by data-testid not role/label/text/DOM). Standalone:
// `node test-check.ts --scan [dir]`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isProjectFile, onStdin, readToolInputField } from "./hook-input.ts";

type Check = { pattern: RegExp; label: string };

const CHECKS: Check[] = [
	{ pattern: /\bfireEvent\b/g, label: "fireEvent: drive interaction with userEvent.setup()" },
	{
		pattern: /\bas\s+(const\b|unknown\b|[A-Z][\w.<>[\]]*)/g,
		label: "`as` cast: type via generics/annotations or narrow, never cast",
	},
	{
		// Postfix non-null `!`: a word/bracket, then `!`, then a member/call/end — but not `!=`.
		pattern: /[\w\])]!(?=[.[(,;)\s]|$)(?!=)/g,
		label: "non-null `!`: narrow honestly (const [x] = …; if (!x) throw)",
	},
	{
		// Indexing a getAll* result without optional-chaining the access.
		pattern: /getAll\w+\([^)]*\)\[\d+\](?!\?)/g,
		label: "unguarded getAllBy…[n]: destructure + guard, or optional-chain",
	},
	{
		pattern: /\.querySelector(All)?\(|\.innerHTML\b/g,
		label: "DOM poking: query by data-testid, not selectors",
	},
	{
		pattern: /\b(get|query|find)(All)?By(Role|LabelText)\(/g,
		label:
			"role/label query: use data-testid instead — exception only for an element a library renders that won't forward a testid (e.g. a Base UI internal like the Slider thumb)",
	},
	{
		pattern: /\b(get|query|find)(All)?ByText\(/g,
		label:
			"text query: use data-testid instead — exception only for content a library renders that won't forward a testid (e.g. Streamdown markdown output)",
	},
];

/** One flagged location inside a piece of text. */
type Hit = { line: number; label: string; excerpt: string };

function lineOf({ text, index }: { text: string; index: number }): number {
	return text.slice(0, index).split("\n").length;
}

// Blanks comments and string/template literals to same-length whitespace (newlines kept), so
// code-level checks never fire on prose inside a test title or string — e.g. `formats … as GB`.
function codeSkeleton(source: string): string {
	const chars = [...source];
	const spans = [
		/\/\*[\s\S]*?\*\//g, // block comments
		/(?<=^|[^:"'`\w])\/\/.*$/gm, // line comments, not URLs
		/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, // string + template literals
	];
	for (const pattern of spans) {
		for (const match of source.matchAll(pattern)) {
			for (let i = match.index; i < match.index + match[0].length; i++) {
				if (chars[i] !== "\n") chars[i] = " ";
			}
		}
	}
	return chars.join("");
}

function findHits(text: string): Hit[] {
	const code = codeSkeleton(text);
	const hits: Hit[] = [];
	for (const { pattern, label } of CHECKS) {
		for (const match of code.matchAll(pattern)) {
			hits.push({ line: lineOf({ text, index: match.index }), label, excerpt: match[0].trim() });
		}
	}
	return hits.sort((a, b) => a.line - b.line);
}

const TEST_FILE = /src[/\\]test[/\\].*\.(ts|tsx)$/;

function scanTree(dir: string): number {
	let total = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			total += scanTree(path);
			continue;
		}
		if (!TEST_FILE.test(path)) continue;
		const hits = findHits(readFileSync(path, "utf8"));
		for (const hit of hits) console.log(`${path}:${hit.line} [${hit.excerpt}] ${hit.label}`);
		total += hits.length;
	}
	return total;
}

if (process.argv[2] === "--scan") {
	const total = scanTree(process.argv[3] ?? "src/test");
	console.log(`${total} hit(s)`);
} else {
	onStdin((raw) => {
		const filePath = readToolInputField(raw, "file_path");
		if (!isProjectFile(filePath) || !TEST_FILE.test(filePath)) process.exit(0);
		const added = readToolInputField(raw, "new_string") || readToolInputField(raw, "content");
		const hits = findHits(added);
		if (hits.length === 0) process.exit(0);
		const report = hits.map((hit) => `- [${hit.excerpt}] ${hit.label}`).join("\n");
		console.error(
			`Test anti-patterns in the text just added to ${filePath} — fix these now:\n${report}\n` +
				"Test the seams we wrote, not the library: query by data-testid, drive with userEvent, narrow honestly.",
		);
		process.exit(2);
	});
}
