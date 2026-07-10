import { resolve, sep } from "node:path";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** True when the path lives inside the project; plan/memory/scratch files do not. */
export function isProjectFile(filePath: string): boolean {
	const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
	const resolved = resolve(filePath);
	return resolved === projectDir || resolved.startsWith(projectDir + sep);
}

/** Parses the Claude Code hook payload and returns one string field of tool_input. */
export function readToolInputField(raw: string, field: string): string {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return "";
		const toolInput = parsed.tool_input;
		if (!isRecord(toolInput)) return "";
		const value = toolInput[field];
		return typeof value === "string" ? value : "";
	} catch {
		return "";
	}
}

/** Parses the Claude Code hook payload and returns one top-level field. */
export function readPayloadField(raw: string, field: string): unknown {
	try {
		const parsed: unknown = JSON.parse(raw);
		return isRecord(parsed) ? parsed[field] : undefined;
	} catch {
		return undefined;
	}
}

/** Extracts combined stdout/stderr from an execSync error without unsafe casts. */
export function execErrorOutput(error: unknown): string {
	if (!isRecord(error)) return "";
	const stdout = error.stdout != null ? String(error.stdout) : "";
	const stderr = error.stderr != null ? String(error.stderr) : "";
	return `${stdout}${stderr}`.trim();
}

/** 1-based line number of `index` within `text`. */
export function lineOf({ text, index }: { text: string; index: number }): number {
	return text.slice(0, index).split("\n").length;
}

const COMMENT_AND_STRING_SPANS = [
	/\/\*[\s\S]*?\*\//g, // block comments
	/(?<=^|[^:"'`\w])\/\/.*$/gm, // line comments, not URLs
	/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, // string + template literals
];

/** Blanks comments and string/template literals to whitespace so code checks never fire on prose. */
export function codeSkeleton(source: string): string {
	const chars = [...source];
	for (const pattern of COMMENT_AND_STRING_SPANS) {
		for (const match of source.matchAll(pattern)) {
			for (let i = match.index; i < match.index + match[0].length; i++) {
				if (chars[i] !== "\n") chars[i] = " ";
			}
		}
	}
	return chars.join("");
}

/** Pulls the human-readable parts out of TS source: comments and string literals. */
export function proseSegments(source: string): { text: string; index: number }[] {
	const segments: { text: string; index: number }[] = [];
	for (const pattern of COMMENT_AND_STRING_SPANS) {
		for (const match of source.matchAll(pattern)) {
			segments.push({ text: match[0], index: match.index });
		}
	}
	return segments;
}

/** Collects stdin and invokes the handler once the stream ends. */
export function onStdin(handler: (raw: string) => void): void {
	let raw = "";
	process.stdin.on("data", (chunk: Buffer) => {
		raw += chunk.toString();
	});
	process.stdin.on("end", () => handler(raw));
}
