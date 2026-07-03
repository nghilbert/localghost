// PreToolUse hook on Bash: Nate commits and pushes himself. Claude verifies the
// work (check, tests, build) and ends its summary with suggested git commands.
import { onStdin, readToolInputField } from "./hook-input.ts";

const GIT_WRITE = /(^|&&|;|\|\|?)\s*git\s+([a-z-]+\s+)*(commit|push)\b/;

onStdin((raw) => {
	const command = readToolInputField(raw, "command");
	if (!GIT_WRITE.test(command)) process.exit(0);
	console.error(
		"BLOCKED: committing and pushing are Nate's job. Run the checks yourself (npm run check, npx vitest run, npm run build), then end your summary with the suggested git add/commit commands for him.",
	);
	process.exit(2);
});
