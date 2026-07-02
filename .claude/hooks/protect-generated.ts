// PreToolUse hook: blocks Edit/Write on generated files and points at the regeneration command.
import { onStdin, readToolInputField } from "./hook-input.ts";

const PROTECTED = [
	{
		pattern: /src[/\\]components[/\\]ui[/\\]/,
		message:
			"src/components/ui/* is shadcn-generated — never edit it. Regenerate with `npx shadcn add <component> --overwrite`.",
	},
	{
		pattern: /routeTree\.gen\.ts$/,
		message:
			"src/routeTree.gen.ts is auto-generated — run the dev server briefly (`timeout 15 npm run dev`) to regenerate it.",
	},
	{
		pattern: /src[/\\]generated[/\\]/,
		message:
			"src/generated/* is Prisma output — edit prisma/schema/ instead and ask Nate to regenerate (prisma commands are his job).",
	},
];

onStdin((raw) => {
	const filePath = readToolInputField(raw, "file_path");
	for (const { pattern, message } of PROTECTED) {
		if (pattern.test(filePath)) {
			console.error(`BLOCKED: ${message}`);
			process.exit(2);
		}
	}
	process.exit(0);
});
