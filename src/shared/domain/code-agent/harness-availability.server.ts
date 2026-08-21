import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CODE_AGENT_HARNESSES, type CodeAgentHarnessId } from "./harnesses";

const run = promisify(execFile);

/**
 * Whether the CLI resolves on this server's PATH, via the POSIX builtin. The name is
 * passed as `$1` rather than interpolated, so the shell never parses it.
 */
async function commandAvailable(executable: string): Promise<boolean> {
	return run("sh", ["-c", 'command -v "$1" > /dev/null', "sh", executable]).then(
		() => true,
		() => false,
	);
}

/** Harness ids whose CLI this server can actually launch. */
export async function availableCodeAgentHarnessIds(): Promise<CodeAgentHarnessId[]> {
	const checks = await Promise.all(
		CODE_AGENT_HARNESSES.map(async (harness) => ({
			id: harness.id,
			available: await commandAvailable(harness.executable),
		})),
	);
	return checks.filter((check) => check.available).map((check) => check.id);
}
