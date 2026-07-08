// Two modes sharing one marker file:
// `--mark` (PostToolUse on Edit|Write and Bash) records that project files changed.
// Stop mode fires once per marked session: if the tree is dirty and the final
// summary lacks git add suggestions, it blocks the stop (exit 2) and asks for
// the commit block Nate expects. `stop_hook_active` guards loops.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isProjectFile, onStdin, readPayloadField, readToolInputField } from "./hook-input.ts";

const FILE_MUTATING_BASH = /\bgit\s+(mv|rm|add|restore|checkout)\b|\bsed\s+-i\b/;

const COMMIT_BLOCK_FORMAT = `This turn changed files but the summary has no commit plan. Nate commits himself, so end your final message with one section per logical change, in this exact shape:

**N. Short change name**
\`\`\`
git add <the paths belonging to this change>
\`\`\`
> Imperative subject line under 70 chars
>
> One to three plain sentences on what moved and why. No co-author or generated-with lines, ever.

Group by logical change (one group per commit), not by directory. Do not run git commit or git push yourself.`;

function markerPath(raw: string): string {
	const sessionId = readPayloadField(raw, "session_id");
	return join(
		tmpdir(),
		`localghost-commit-suggestion-${typeof sessionId === "string" ? sessionId : "any"}`,
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Text of the turn's trailing assistant entries in the transcript JSONL. */
function finalAssistantText(transcriptPath: string): string {
	let lines: string[];
	try {
		lines = readFileSync(transcriptPath, "utf8").trim().split("\n");
	} catch {
		return "";
	}

	const texts: string[] = [];
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i];
		if (line === undefined) continue;
		let entry: unknown;
		try {
			entry = JSON.parse(line);
		} catch {
			continue;
		}
		if (!isRecord(entry)) continue;
		if (entry.type === "user") break;
		if (entry.type !== "assistant") continue;
		const message = entry.message;
		if (!isRecord(message)) continue;
		if (typeof message.content === "string") {
			texts.push(message.content);
			continue;
		}
		if (Array.isArray(message.content)) {
			for (const block of message.content) {
				if (isRecord(block) && block.type === "text" && typeof block.text === "string") {
					texts.push(block.text);
				}
			}
		}
	}
	return texts.join("\n");
}

function treeIsDirty(): boolean {
	try {
		const out = execSync("git status --porcelain", { stdio: "pipe", timeout: 10_000 });
		return out.toString().trim().length > 0;
	} catch {
		return false;
	}
}

onStdin((raw) => {
	if (process.argv[2] === "--mark") {
		const filePath = readToolInputField(raw, "file_path");
		const command = readToolInputField(raw, "command");
		const changedProjectFile = filePath !== "" && isProjectFile(filePath);
		if (changedProjectFile || FILE_MUTATING_BASH.test(command)) {
			writeFileSync(markerPath(raw), "");
		}
		process.exit(0);
	}

	const marker = markerPath(raw);
	if (!existsSync(marker)) process.exit(0);
	rmSync(marker, { force: true });
	if (readPayloadField(raw, "stop_hook_active") === true) process.exit(0);
	if (!treeIsDirty()) process.exit(0);

	const transcriptPath = readPayloadField(raw, "transcript_path");
	if (typeof transcriptPath === "string") {
		// The final assistant message may not be flushed to the transcript when
		// Stop hooks run; poll briefly before concluding it lacks a commit block.
		for (let attempt = 0; attempt < 6; attempt++) {
			const text = finalAssistantText(transcriptPath);
			if (/git add/.test(text)) process.exit(0);
			if (text !== "") break;
			execSync("sleep 0.3");
		}
	}

	console.error(COMMIT_BLOCK_FORMAT);
	process.exit(2);
});
