// PreToolUse hook on Bash: Nate runs all prisma commands himself. Claude edits
// schema files only and hands off. Exit 2 blocks the command.
import { onStdin, readToolInputField } from "./hook-input.ts";

const PRISMA_COMMAND =
	/\bprisma\b[^|;&]*\b(generate|migrate|db|studio|push|reset)\b|\bnpm\s+run\s+prisma\b/;

onStdin((raw) => {
	const command = readToolInputField(raw, "command");
	if (!PRISMA_COMMAND.test(command)) process.exit(0);
	console.error(
		"BLOCKED: prisma commands (generate/migrate/db/studio) are Nate's job. Edit files under prisma/schema/ only, then tell him what to run.",
	);
	process.exit(2);
});
