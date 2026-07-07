// Two modes sharing one marker file:
// `--mark` (PostToolUse on Edit|Write) records that a .ts/.tsx file changed.
// Stop mode runs `tsc --noEmit` once per marked session and blocks the stop
// (exit 2) until the project type-checks. `stop_hook_active` guards loops.
import { execSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execErrorOutput, onStdin, readPayloadField, readToolInputField } from "./hook-input.ts";

function markerPath(raw: string): string {
	const sessionId = readPayloadField(raw, "session_id");
	return join(
		tmpdir(),
		`localghost-typecheck-${typeof sessionId === "string" ? sessionId : "any"}`,
	);
}

onStdin((raw) => {
	if (process.argv[2] === "--mark") {
		if (/\.(ts|tsx)$/.test(readToolInputField(raw, "file_path"))) {
			writeFileSync(markerPath(raw), "");
		}
		process.exit(0);
	}

	const marker = markerPath(raw);
	if (!existsSync(marker)) process.exit(0);
	rmSync(marker, { force: true });
	if (readPayloadField(raw, "stop_hook_active") === true) process.exit(0);

	try {
		execSync("npm run typecheck", { stdio: "pipe", timeout: 120_000 });
		process.exit(0);
	} catch (error) {
		console.error(
			`tsc found type errors in this turn's edits — fix them before finishing:\n${execErrorOutput(error).slice(-4000)}`,
		);
		process.exit(2);
	}
});
