// PostToolUse hook on Edit|Write: enforces the mechanically-decidable naming rules on the text
// a tool call added to a src file, then feeds the hits back to Claude (exit 2; the edit stands).
// Only rules a regex can decide without false positives live here; the judgment calls (list* vs
// get*, domain vs infra file names, layering verbs) stay as prose in CLAUDE.md. Standalone:
// `node naming-check.ts --scan [dir]`.
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { isProjectFile, onStdin, readToolInputField } from "./hook-input.ts";

type Check = { pattern: RegExp; label: string };

const CHECKS: Check[] = [
	{
		// Zod schemas are runtime values, so camelCase. Types (`type XSchema`) are unaffected.
		pattern: /export\s+const\s+[A-Z]\w*Schema\b/g,
		label: "PascalCase Zod schema: schemas are values, name them camelCase (xSchema)",
	},
];

/** One flagged location inside a piece of text. */
type Hit = { line: number; label: string; excerpt: string };

function lineOf({ text, index }: { text: string; index: number }): number {
	return text.slice(0, index).split("\n").length;
}

// Blanks comments and string/template literals so a rule never fires on prose inside a string.
function codeSkeleton(source: string): string {
	const chars = [...source];
	const spans = [
		/\/\*[\s\S]*?\*\//g,
		/(?<=^|[^:"'`\w])\/\/.*$/gm,
		/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g,
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

const SRC_FILE = /src[/\\].*\.(ts|tsx)$/;
const GENERATED = /(src[/\\]generated[/\\]|\.gen\.ts$)/;
const CLIENT_SUFFIX = /\.client\.ts$/;

function clientSuffixHit(filePath: string): string | null {
	if (!CLIENT_SUFFIX.test(filePath)) return null;
	return (
		`${basename(filePath)} uses the \`.client.ts\` suffix, a TanStack Start build boundary that ` +
		"strips the module from the server bundle and breaks SSR imports. Isomorphic client modules " +
		"use a plain hyphenated name (auth-client.ts)."
	);
}

function scanTree(dir: string): number {
	let total = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			total += scanTree(path);
			continue;
		}
		if (!SRC_FILE.test(path) || GENERATED.test(path)) continue;
		const suffix = clientSuffixHit(path);
		if (suffix) {
			console.log(`${path} ${suffix}`);
			total += 1;
		}
		for (const hit of findHits(readFileSync(path, "utf8"))) {
			console.log(`${path}:${hit.line} [${hit.excerpt}] ${hit.label}`);
			total += 1;
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
		if (!isProjectFile(filePath) || !SRC_FILE.test(filePath) || GENERATED.test(filePath)) {
			process.exit(0);
		}
		const problems: string[] = [];
		const suffix = clientSuffixHit(filePath);
		if (suffix) problems.push(`- ${suffix}`);
		const added = readToolInputField(raw, "new_string") || readToolInputField(raw, "content");
		for (const hit of findHits(added)) problems.push(`- [${hit.excerpt}] ${hit.label}`);
		if (problems.length === 0) process.exit(0);
		console.error(`Naming rules broken in ${filePath} — fix these now:\n${problems.join("\n")}`);
		process.exit(2);
	});
}
