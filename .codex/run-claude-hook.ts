import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function valueAt(value: unknown, field: string): string {
	if (!isRecord(value)) return "";
	const direct = value[field];
	if (typeof direct === "string") return direct;

	const aliases: Record<string, string[]> = {
		command: ["cmd"],
		content: ["patch"],
		file_path: ["filePath", "path"],
		new_string: ["newString"],
	};

	for (const alias of aliases[field] ?? []) {
		const aliased = value[alias];
		if (typeof aliased === "string") return aliased;
	}

	return "";
}

function toolInputCandidates(parsed: Record<string, unknown>): unknown[] {
	return [
		parsed.tool_input,
		parsed.toolInput,
		parsed.input,
		parsed.arguments,
		parsed.params,
		isRecord(parsed.tool) ? parsed.tool.input : undefined,
		parsed,
	];
}

function claudePayload(raw: string): string {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return raw;

		const toolInput = isRecord(parsed.tool_input) ? { ...parsed.tool_input } : {};
		for (const field of ["file_path", "command", "new_string", "content"]) {
			if (typeof toolInput[field] === "string") continue;
			for (const candidate of toolInputCandidates(parsed)) {
				const value = valueAt(candidate, field);
				if (value) {
					toolInput[field] = value;
					break;
				}
			}
		}

		return JSON.stringify({ ...parsed, tool_input: toolInput });
	} catch {
		return raw;
	}
}

function onStdin(handler: (raw: string) => void): void {
	let raw = "";
	const onData = (chunk: Buffer) => {
		raw += chunk.toString();
	};
	const onEnd = () => {
		process.stdin.off("data", onData);
		process.stdin.off("end", onEnd);
		handler(raw);
	};
	process.stdin.on("data", onData);
	process.stdin.once("end", onEnd);
}

const [hookName, ...hookArgs] = process.argv.slice(2);

if (!hookName || hookName.includes("/") || hookName.includes("\\") || !hookName.endsWith(".ts")) {
	console.error("Usage: run-claude-hook.ts <hook-name.ts> [...args]");
	process.exit(2);
}

const hooksDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(hooksDir, "..");
const hookPath = resolve(projectRoot, ".claude", "hooks", hookName);

onStdin(async (raw) => {
	process.argv = [process.argv[0] ?? "node", hookPath, ...hookArgs];
	process.env.CLAUDE_PROJECT_DIR = projectRoot;
	process.chdir(projectRoot);

	await import(pathToFileURL(hookPath).href);

	process.stdin.emit("data", Buffer.from(claudePayload(raw)));
	process.stdin.emit("end");
});
