// PreToolUse hook: policy guards that block (exit 2) actions reserved for the user or that would
// corrupt generated or secret files. Dispatches by tool:
//   Bash                       -> prisma mutations and git commit/push are the user's job
//   Read|Edit|Write|Notebook   -> .env holds real secrets, stays out of the transcript
//   Edit|Write|Notebook        -> generated files (shadcn ui, routeTree, prisma client) are read-only
import { basename } from "node:path";
import { onStdin, readPayloadField, readToolInputField } from "./hook-input";

function block(message: string): never {
	console.error(`BLOCKED: ${message}`);
	process.exit(2);
}

const GENERATED = [
	{
		pattern: /routeTree\.gen\.ts$/,
		message:
			"src/routeTree.gen.ts is auto-generated. Run the dev server briefly (`timeout 15 npm run dev`) to regenerate it.",
	},
	{
		pattern: /src[/\\]generated[/\\]/,
		message:
			"src/generated/* is Prisma output. Edit prisma/schema/ instead and ask the user to regenerate (prisma commands are his job).",
	},
];

/** Both `prisma <cmd>` and `npm run prisma -- <cmd>`, but only the mutating subcommands. */
const PRISMA_COMMAND = /\b(prisma|npm\s+run\s+prisma)\b[^|;&]*\b(generate|migrate|push|reset)\b/;
const GIT_WRITE = /(^|&&|;|\|\|?)\s*git\s+([a-z-]+\s+)*(commit|push)\b/;

function isEnvFile(name: string): boolean {
	return name === ".env" || /^\.env\.(?!example$).+/.test(name);
}

onStdin((raw) => {
	const tool = readPayloadField(raw, "tool_name");

	if (tool === "Bash") {
		const command = readToolInputField(raw, "command");
		if (PRISMA_COMMAND.test(command)) {
			block(
				"prisma commands (generate/migrate/push/reset) are the user's job. Edit files under prisma/schema/ only, then tell him what to run.",
			);
		}
		if (GIT_WRITE.test(command)) {
			block(
				"committing and pushing are the user's job. Run the checks yourself (npm run check, npm test run, npm run build), then end your summary with one section per logical change: a fenced `git add <paths>` command followed by the commit message in its own fenced code block (imperative subject under 70 chars, blank line, one to three sentences of what and why), so both are copy-pasteable. No co-author or generated-with lines.",
			);
		}
		process.exit(0);
	}

	const filePath = readToolInputField(raw, "file_path");
	if (isEnvFile(basename(filePath))) {
		block(
			".env holds real secrets and stays out of the conversation. Read .env.example for the variable names; ask the user to change values.",
		);
	}
	if (tool !== "Read") {
		for (const { pattern, message } of GENERATED) {
			if (pattern.test(filePath)) block(message);
		}
	}
	process.exit(0);
});
