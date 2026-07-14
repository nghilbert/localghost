// PostToolUse hook on Edit|Write: one process running three regex check-sets over the text a tool
// call added, dispatched by file type, feeding any hits back to Claude (exit 2; the edit stands).
//   - prose tells (AI-sounding language + comment bloat) on .md and .ts/.tsx
//   - naming rules (PascalCase Zod, .client.ts suffix) on src .ts/.tsx
//   - test anti-patterns (fireEvent, casts, role/text queries) on src/test files
// Only rules a regex can decide without false positives live here; judgment calls stay as prose in
// CLAUDE.md. Standalone audit: `node text-check.ts --scan [dir]`.
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
	codeSkeleton,
	isProjectFile,
	lineOf,
	onStdin,
	proseSegments,
	readToolInputField,
} from "./hook-input";

/** One flagged location inside a piece of text. */
type Hit = { line: number; label: string; excerpt: string };
type Check = { pattern: RegExp; label: string };

const MAX_COMMENT_LINES = 5;

// --- Prose tells (Wikipedia "Signs of AI writing") -------------------------------------------
type Tell = Check & { prose?: boolean };
const TELLS: Tell[] = [
	// `prose` tells only fire in segments with words, so a bare "—" empty-cell glyph passes.
	{ pattern: /—|–/g, label: "em/en dash: use a comma, colon, or period", prose: true },
	{ pattern: /[“”‘’]/g, label: "curly quote: use straight quotes", prose: true },
	{
		pattern:
			/\b(delve|delving|seamless(ly)?|leverag(e|es|ing)|crucial|pivotal|showcas(e|es|ing)|testament|tapestry|landscape|foster(s|ing)?|boast(s|ing)|meticulous(ly)?|vibrant|intricate|intricacies|garner(s|ed)?|elevat(e|es|ing)|empower(s|ing)?|effortless(ly)?|supercharg(e|es|ing)|streamlin(e|es|ed|ing)|comprehensive|robust(ly)?|underscor(es|ing))\b/gi,
		label: "AI-tell word: use the plain word for what it is",
	},
	{
		pattern: /\bnot (just|only|merely)\b[^.\n]{0,60}\bbut\b/gi,
		label: "negative parallelism (not just X, but Y): state the one thing that's true",
	},
	{ pattern: /\b(serves|stands) as\b/gi, label: "'serves as': write 'is'" },
	{
		pattern: /\bit'?s (important|worth) (to note|noting|remembering)\b/gi,
		label: "throat-clearing: just state the fact",
	},
	{
		pattern: /\b(in today'?s|in the world of|in the realm of|at the end of the day)\b/gi,
		label: "stock framing phrase: cut it",
	},
	{ pattern: /\bwhether you'?re\b/gi, label: "marketing second-person hedge: cut it" },
	{
		pattern: /\b(dive|diving|deep dive) (in|into|deeper)\b/gi,
		label: "'dive into': write 'see' or 'read'",
	},
	{ pattern: /\b(great|excellent) (question|point|choice)\b/gi, label: "sycophancy: cut it" },
	{ pattern: /\boops\b/gi, label: "cutesy error copy: say what failed and what to do" },
];

function findProseHits({ text, isMarkdown }: { text: string; isMarkdown: boolean }): Hit[] {
	const hits: Hit[] = [];
	const segments = isMarkdown ? [{ text, index: 0 }] : proseSegments(text);
	for (const segment of segments) {
		const hasWords = /[a-z]{2,}/i.test(segment.text);
		for (const { pattern, label, prose } of TELLS) {
			if (prose && !hasWords) continue;
			for (const match of segment.text.matchAll(pattern)) {
				hits.push({
					line: lineOf({ text, index: segment.index + match.index }),
					label,
					excerpt: match[0],
				});
			}
		}
	}
	if (!isMarkdown) {
		for (const match of text.matchAll(/\/\*[\s\S]*?\*\/|(?:^[ \t]*\/\/.*\n?)+/gm)) {
			const lines = match[0].trim().split("\n").length;
			if (lines > MAX_COMMENT_LINES) {
				hits.push({
					line: lineOf({ text, index: match.index }),
					label: `comment block of ${lines} lines: cap is ${MAX_COMMENT_LINES}, keep only what the code can't say`,
					excerpt: `${match[0].trim().split("\n")[0]}...`,
				});
			}
		}
	}
	return hits;
}

// --- Naming rules ----------------------------------------------------------------------------
const NAMING_CHECKS: Check[] = [
	{
		// Zod schemas are runtime values, so camelCase. Types (`type XSchema`) are unaffected.
		pattern: /export\s+const\s+[A-Z]\w*Schema\b/g,
		label: "PascalCase Zod schema: schemas are values, name them camelCase (xSchema)",
	},
];

const CLIENT_SUFFIX = /\.client\.ts$/;
function clientSuffixHit(filePath: string): string | null {
	if (!CLIENT_SUFFIX.test(filePath)) return null;
	return (
		`${basename(filePath)} uses the \`.client.ts\` suffix, a TanStack Start build boundary that ` +
		"strips the module from the server bundle and breaks SSR imports. Isomorphic client modules " +
		"use a plain hyphenated name (auth-client.ts)."
	);
}

// --- Test anti-patterns ----------------------------------------------------------------------
const TEST_CHECKS: Check[] = [
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

function runChecks({ code, text, checks }: { code: string; text: string; checks: Check[] }): Hit[] {
	const hits: Hit[] = [];
	for (const { pattern, label } of checks) {
		for (const match of code.matchAll(pattern)) {
			hits.push({ line: lineOf({ text, index: match.index }), label, excerpt: match[0].trim() });
		}
	}
	return hits;
}

// --- Dispatch by file type -------------------------------------------------------------------
const MD_FILE = /\.md$/;
const SRC_TS = /src[/\\].*\.(ts|tsx)$/;
const TEST_FILE = /src[/\\]test[/\\].*\.(ts|tsx)$/;
const GENERATED = /(src[/\\]generated[/\\]|\.gen\.ts$)/;
const SKIP_PROSE =
	/\.claude[/\\]hooks|src[/\\]shared[/\\]ui[/\\]|src[/\\]generated[/\\]|routeTree\.gen\.ts|node_modules/;

/** A named group of hits for one check-set, for readable per-category reports. */
type Section = { heading: string; hits: Hit[]; extra?: string[] };

/** Every check-set that applies to `filePath`, run against `text`. */
function analyze({ filePath, text }: { filePath: string; text: string }): Section[] {
	const sections: Section[] = [];
	const isMarkdown = MD_FILE.test(filePath);
	const isSrcTs = SRC_TS.test(filePath) && !GENERATED.test(filePath);

	if ((isMarkdown || isSrcTs) && !SKIP_PROSE.test(filePath)) {
		const hits = findProseHits({ text, isMarkdown });
		if (hits.length > 0) sections.push({ heading: "Robotic prose", hits });
	}
	if (isSrcTs) {
		const code = codeSkeleton(text);
		const hits = runChecks({ code, text, checks: NAMING_CHECKS });
		const suffix = clientSuffixHit(filePath);
		if (hits.length > 0 || suffix) {
			sections.push({ heading: "Naming rules", hits, extra: suffix ? [suffix] : undefined });
		}
	}
	if (TEST_FILE.test(filePath)) {
		const hits = runChecks({ code: codeSkeleton(text), text, checks: TEST_CHECKS });
		if (hits.length > 0) sections.push({ heading: "Test anti-patterns", hits });
	}
	return sections;
}

function report({ filePath, sections }: { filePath: string; sections: Section[] }): string {
	const blocks = sections.map(({ heading, hits, extra }) => {
		const lines = [...(extra ?? []).map((e) => `- ${e}`)];
		for (const hit of [...hits].sort((a, b) => a.line - b.line)) {
			lines.push(`- [${hit.excerpt}] ${hit.label}`);
		}
		return `${heading}:\n${lines.join("\n")}`;
	});
	return (
		`Issues in the text just added to ${filePath} — fix these now:\n\n${blocks.join("\n\n")}\n\n` +
		"Write like a terse engineer: plain words, no gloss. Test the seams we wrote, not the library."
	);
}

function scanTree(dir: string): number {
	let total = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!/node_modules$/.test(path)) total += scanTree(path);
			continue;
		}
		if (!MD_FILE.test(path) && !SRC_TS.test(path)) continue;
		for (const { heading, hits, extra } of analyze({
			filePath: path,
			text: readFileSync(path, "utf8"),
		})) {
			for (const e of extra ?? []) console.log(`${path} ${e}`);
			for (const hit of hits)
				console.log(`${path}:${hit.line} [${hit.excerpt}] ${heading}: ${hit.label}`);
			total += hits.length + (extra?.length ?? 0);
		}
	}
	return total;
}

if (process.argv[2] === "--scan") {
	const total = scanTree(process.argv[3] ?? "src");
	console.log(`${total} hit(s)`);
} else {
	onStdin((raw) => {
		const filePath = readToolInputField(raw, "file_path");
		if (!isProjectFile(filePath)) process.exit(0);
		const text = readToolInputField(raw, "new_string") || readToolInputField(raw, "content");
		const sections = analyze({ filePath, text });
		if (sections.length === 0) process.exit(0);
		console.error(report({ filePath, sections }));
		process.exit(2);
	});
}
