// PreToolUse hook: the one blocking layer. Denies actions reserved for the user or that would
// corrupt generated or secret files. Dispatches by tool:
//   Bash            -> prisma mutations and git commit/push are the user's job
//   Read|Edit|Write -> .env holds real secrets, stays out of the transcript
//   Edit|Write      -> generated files (routeTree, prisma client) are read-only
import { basename } from "node:path";
// @ts-expect-error node ESM needs the real .ts specifier; tsc resolves it fine
import { deny, onHookInput } from "./hook-input.ts";

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

onHookInput(({ toolName, field }) => {
	if (toolName === "Bash") {
		const command = field("command");
		if (PRISMA_COMMAND.test(command)) {
			return deny(
				"prisma commands (generate/migrate/push/reset) are the user's job. Edit files under prisma/schema/ only, then tell him what to run.",
			);
		}
		if (GIT_WRITE.test(command)) {
			return deny(
				"committing and pushing are the user's job. Run the checks, then end your summary with the `git add` and commit-message blocks described in CLAUDE.md's Workflow section.",
			);
		}
		return;
	}

	const filePath = field("file_path");
	if (isEnvFile(basename(filePath))) {
		return deny(
			".env holds real secrets and stays out of the conversation. Read .env.example for the variable names; ask the user to change values.",
		);
	}
	if (toolName !== "Read") {
		for (const { pattern, message } of GENERATED) {
			if (pattern.test(filePath)) return deny(message);
		}
	}
});
