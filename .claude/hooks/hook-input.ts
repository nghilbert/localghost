// Shared plumbing for the two hooks: one stdin reader, the two JSON output shapes, and the text
// helpers the checks run on. Nothing here calls process.exit: stdout is a pipe, so an early exit
// can truncate the JSON before Claude Code reads it. Hooks return instead and let the process end.
import { resolve, sep } from "node:path";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** A parsed hook payload: the tool that fired, and a reader for one string field of its input. */
type HookInput = { toolName: string; field: (name: string) => string };

function parse(raw: string): HookInput {
	let payload: unknown;
	try {
		payload = JSON.parse(raw);
	} catch {
		payload = undefined;
	}
	const record = isRecord(payload) ? payload : {};
	const toolInput = isRecord(record.tool_input) ? record.tool_input : {};
	return {
		toolName: typeof record.tool_name === "string" ? record.tool_name : "",
		field: (name) => {
			const value = toolInput[name];
			return typeof value === "string" ? value : "";
		},
	};
}

/** Collects the payload from stdin and invokes the handler once the stream ends. */
export function onHookInput(handler: (input: HookInput) => void): void {
	let raw = "";
	process.stdin.on("data", (chunk: Buffer) => {
		raw += chunk.toString();
	});
	process.stdin.on("end", () => handler(parse(raw)));
}

/** Blocks the pending tool call, showing `reason` as the permission decision. */
export function deny(reason: string): void {
	process.stdout.write(
		`${JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: reason,
			},
		})}\n`,
	);
}

/** Feeds `context` back to Claude after the tool ran, without interrupting the turn. */
export function postToolContext(context: string): void {
	process.stdout.write(
		`${JSON.stringify({
			hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context },
			suppressOutput: true,
		})}\n`,
	);
}

/** True when the path lives inside the project; plan/memory/scratch files do not. */
export function isProjectFile(filePath: string): boolean {
	const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
	const resolved = resolve(filePath);
	return resolved === projectDir || resolved.startsWith(projectDir + sep);
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
