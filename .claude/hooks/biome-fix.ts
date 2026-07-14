// PostToolUse hook: auto-fixes the edited file via `npm run fix` (the repo's
// canonical biome command) and feeds any remaining diagnostics back to Claude
// (exit 2 routes stderr to the model). execFileSync keeps shell expansion away
// from paths like routes/chat/$conversationId.tsx.
import { execFileSync } from "node:child_process";
import { execErrorOutput, onStdin, readToolInputField } from "./hook-input";

onStdin((raw) => {
	const filePath = readToolInputField(raw, "file_path");
	if (!/src[/\\].*\.(ts|tsx|css)$/.test(filePath) || /routeTree\.gen\.ts$/.test(filePath)) {
		process.exit(0);
	}
	try {
		execFileSync("npm", ["run", "fix", "--", filePath], { stdio: "pipe" });
		process.exit(0);
	} catch (error) {
		const output = execErrorOutput(error);
		console.error(`biome found unfixable issues in ${filePath}:\n${output.slice(0, 4000)}`);
		process.exit(2);
	}
});
