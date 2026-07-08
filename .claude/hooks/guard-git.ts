// PreToolUse hook on Bash: Nate commits and pushes himself. Claude verifies the
// work (check, tests, build) and ends its summary with suggested git commands.
import { onStdin, readToolInputField } from "./hook-input.ts";

const GIT_WRITE = /(^|&&|;|\|\|?)\s*git\s+([a-z-]+\s+)*(commit|push)\b/;

onStdin((raw) => {
	const command = readToolInputField(raw, "command");
	if (!GIT_WRITE.test(command)) process.exit(0);
	console.error(
		"BLOCKED: committing and pushing are Nate's job. Run the checks yourself (npm run check, npm test run, npm run build), then end your summary with one section per logical change: a fenced `git add <paths>` command followed by a blockquoted commit message (imperative subject under 70 chars, blank line, one to three sentences of what and why). No co-author or generated-with lines.",
	);
	process.exit(2);
});
