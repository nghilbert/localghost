// PreToolUse hook on Bash: any `git commit` must pass the project's gates first.
// Exit 2 blocks the commit and feeds the failing gate's output back to Claude.
import { execSync } from "node:child_process";
import { execErrorOutput, onStdin, readToolInputField } from "./hook-input.ts";

const GATES = ["npm run check", "npx vitest run", "npm run build"];

onStdin((raw) => {
	const command = readToolInputField(raw, "command");
	if (!/(^|&&|;|\|\|?)\s*git\s+([a-z-]+\s+)*commit\b/.test(command)) {
		process.exit(0);
	}
	for (const gate of GATES) {
		try {
			execSync(gate, { stdio: "pipe", timeout: 240_000 });
		} catch (error) {
			const output = execErrorOutput(error);
			console.error(
				`COMMIT BLOCKED — gate \`${gate}\` failed. Fix the issues, then retry the commit (run \`npm run fix\` first if these are lint/format errors):\n${output.slice(-4000)}`,
			);
			process.exit(2);
		}
	}
	process.exit(0);
});
