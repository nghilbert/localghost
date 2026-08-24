import { mkdir, readdir, realpath } from "node:fs/promises";
import os from "node:os";
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
 * The tree the workspace browser opens into: `CODE_AGENT_WORKSPACE_ROOT` if set, else the
 * user's home directory, so existing projects are reachable with no setup. The browser
 * itself keeps the bare root from being picked as a session's own workspace.
 */
export async function getCodeAgentWorkspaceRoot(): Promise<string> {
	const root = process.env.CODE_AGENT_WORKSPACE_ROOT || os.homedir();
	await mkdir(root, { recursive: true });
	return root;
}

/**
 * Resolves `target` (absolute, or relative to `root`) against `root`, rejecting anything
 * that escapes it. Resolves symlinks first, so one inside `root` can't point out; a
 * not-yet-created target (a folder about to be made) falls back to a plain join.
 */
export async function resolveContainedPath({
	root,
	target,
}: {
	root: string;
	target: string;
}): Promise<string> {
	const joined = path.isAbsolute(target) ? target : path.join(root, target);
	const resolved = await realpath(joined).catch(() => path.resolve(joined));
	const resolvedRoot = await realpath(root).catch(() => path.resolve(root));
	if (!pathIsInside({ candidate: resolved, root: resolvedRoot })) {
		throw new Error(`${target} is outside the workspace root.`);
	}
	return resolved;
}

/** Direct child directories under `root`/`subpath`, hidden ones excluded. */
export async function listWorkspaceEntries({
	root,
	subpath,
}: {
	root: string;
	subpath: string;
}): Promise<string[]> {
	const dir = await resolveContainedPath({ root, target: subpath });
	const entries = await readdir(dir, { withFileTypes: true }).catch(() => {
		throw new Error("This folder no longer exists.");
	});
	return entries
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.map((entry) => entry.name)
		.sort();
}
