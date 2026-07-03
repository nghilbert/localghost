// PostToolUse hook on Edit|Write: flags AI-sounding language and bloated comments
// in the text a tool call added, then feeds the hits back to Claude (exit 2; the
// edit itself stands). Tell list distilled from Wikipedia's "Signs of AI writing".
// Standalone scanner: `node prose-check.ts --scan [dir]` reports across a tree.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isProjectFile, onStdin, readToolInputField } from "./hook-input.ts";

const MAX_COMMENT_LINES = 5;

type Tell = { pattern: RegExp; label: string; prose?: boolean };

const TELLS: Tell[] = [
	// `prose` tells only fire in segments with words, so a bare "—" empty-cell
	// glyph or decorative divider passes.
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

/** One flagged location inside a piece of text. */
type Hit = { line: number; label: string; excerpt: string };

function lineOf({ text, index }: { text: string; index: number }): number {
	return text.slice(0, index).split("\n").length;
}

/** Pulls the human-readable parts out of TS source: comments and string literals. */
function proseSegments(source: string): { text: string; index: number }[] {
	const segments: { text: string; index: number }[] = [];
	const patterns = [
		/\/\*[\s\S]*?\*\//g, // block comments
		/(?<=^|[^:"'`\w])\/\/.*$/gm, // line comments, not URLs
		/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, // string literals
	];
	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			segments.push({ text: match[0], index: match.index });
		}
	}
	return segments;
}

function findTells({ text, isMarkdown }: { text: string; isMarkdown: boolean }): Hit[] {
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
	// Comment bloat: any single comment block longer than the cap.
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
	return hits.sort((a, b) => a.line - b.line);
}

const SKIP_PATH =
	/\.claude[/\\]hooks|src[/\\](components[/\\]ui|generated)[/\\]|routeTree\.gen\.ts|node_modules/;
const PROSE_FILE = /\.(ts|tsx|md)$/;

function scanTree(dir: string): number {
	let total = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (SKIP_PATH.test(path)) continue;
		if (entry.isDirectory()) {
			total += scanTree(path);
			continue;
		}
		if (!PROSE_FILE.test(path)) continue;
		const hits = findTells({ text: readFileSync(path, "utf8"), isMarkdown: path.endsWith(".md") });
		for (const hit of hits) console.log(`${path}:${hit.line} [${hit.excerpt}] ${hit.label}`);
		total += hits.length;
	}
	return total;
}

if (process.argv[2] === "--scan") {
	const total = scanTree(process.argv[3] ?? "src");
	console.log(`${total} hit(s)`);
} else {
	onStdin((raw) => {
		const filePath = readToolInputField(raw, "file_path");
		if (!isProjectFile(filePath) || !PROSE_FILE.test(filePath) || SKIP_PATH.test(filePath)) {
			process.exit(0);
		}
		const added = readToolInputField(raw, "new_string") || readToolInputField(raw, "content");
		const hits = findTells({ text: added, isMarkdown: filePath.endsWith(".md") });
		if (hits.length === 0) process.exit(0);
		const report = hits.map((hit) => `- [${hit.excerpt}] ${hit.label}`).join("\n");
		console.error(
			`Robotic prose in the text just added to ${filePath} — fix these now:\n${report}\nWrite like a terse engineer: plain words, no gloss, no rule-of-three flourishes.`,
		);
		process.exit(2);
	});
}
