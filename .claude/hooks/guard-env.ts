// PreToolUse hook on Read|Edit|Write: .env holds real secrets (ENCRYPTION_KEY,
// BETTER_AUTH_SECRET) that must stay out of the transcript. Exit 2 blocks.
import { basename } from "node:path";
import { onStdin, readToolInputField } from "./hook-input.ts";

onStdin((raw) => {
	const filePath = readToolInputField(raw, "file_path");
	const name = basename(filePath);
	if (name !== ".env" && !/^\.env\.(?!example$).+/.test(name)) process.exit(0);
	console.error(
		"BLOCKED: .env holds real secrets and stays out of the conversation. Read .env.example for the variable names; ask Nate to change values.",
	);
	process.exit(2);
});
