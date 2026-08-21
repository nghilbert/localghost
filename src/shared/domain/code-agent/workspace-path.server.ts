import { realpath } from "node:fs/promises";
import path from "node:path";

/**
 * Whether `candidate` is `root` or sits beneath it. Compares with a trailing
 * separator, so `/srv/work-evil` is not inside `/srv/work`.
 */
export function pathIsInside({ candidate, root }: { candidate: string; root: string }): boolean {
	if (candidate === root) return true;
	const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
	return candidate.startsWith(rootWithSep);
}

/**
 * Rejects a workspace outside `CODE_AGENT_WORKSPACE_ROOT`, when set. Unset means the
 * native loop, where the user's own filesystem is the bound. Resolves symlinks first,
 * so a link inside the root cannot point out of it.
 */
export async function assertWorkspacePathAllowed(workspacePath: string): Promise<void> {
	const root = process.env.CODE_AGENT_WORKSPACE_ROOT;
	if (!root) return;
	const resolvedRoot = await realpath(root).catch(() => path.resolve(root));
	const candidate = await realpath(workspacePath).catch(() => path.resolve(workspacePath));
	if (!pathIsInside({ candidate, root: resolvedRoot })) {
		throw new Error(`${workspacePath} is outside CODE_AGENT_WORKSPACE_ROOT.`);
	}
}
