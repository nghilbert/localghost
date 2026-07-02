function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Parses the Claude Code hook payload and returns one string field of tool_input. */
export function readToolInputField(raw: string, field: string): string {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return "";
		const toolInput = parsed.tool_input;
		if (!isRecord(toolInput)) return "";
		const value = toolInput[field];
		return typeof value === "string" ? value : "";
	} catch {
		return "";
	}
}

/** Parses the Claude Code hook payload and returns one top-level field. */
export function readPayloadField(raw: string, field: string): unknown {
	try {
		const parsed: unknown = JSON.parse(raw);
		return isRecord(parsed) ? parsed[field] : undefined;
	} catch {
		return undefined;
	}
}

/** Extracts combined stdout/stderr from an execSync error without unsafe casts. */
export function execErrorOutput(error: unknown): string {
	if (!isRecord(error)) return "";
	const stdout = error.stdout != null ? String(error.stdout) : "";
	const stderr = error.stderr != null ? String(error.stderr) : "";
	return `${stdout}${stderr}`.trim();
}

/** Collects stdin and invokes the handler once the stream ends. */
export function onStdin(handler: (raw: string) => void): void {
	let raw = "";
	process.stdin.on("data", (chunk: Buffer) => {
		raw += chunk.toString();
	});
	process.stdin.on("end", () => handler(raw));
}
