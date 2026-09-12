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

/** Whether any path segment between `root` and `candidate` starts with `.` (a hidden directory). */
function hasHiddenSegment({ candidate, root }: { candidate: string; root: string }): boolean {
	const relative = path.relative(root, candidate);
	if (!relative || relative.startsWith("..")) return false;
	return relative.split(path.sep).some((segment) => segment.startsWith("."));
}

/**
 * `realpath`, walking up to the nearest existing ancestor first. A not-yet-created
 * target throws on plain `realpath`; this still catches a symlink planted at an
 * existing ancestor (`$HOME/link -> /etc`) that a `path.resolve` fallback would miss.
 */
async function realpathNearestExisting(target: string): Promise<string> {
	try {
		return await realpath(target);
	} catch {
		const parent = path.dirname(target);
		if (parent === target) return target;
		return path.join(await realpathNearestExisting(parent), path.basename(target));
	}
}

/**
 * The tree the workspace browser opens into: `CODE_AGENT_WORKSPACE_ROOT` if set, else the
 * user's home directory, so existing projects are reachable with no setup.
 */
export async function getCodeAgentWorkspaceRoot(): Promise<string> {
	const root = process.env.CODE_AGENT_WORKSPACE_ROOT || os.homedir();
	await mkdir(root, { recursive: true });
	return root;
}

/**
 * Resolves `target` (absolute, or relative to `root`) against `root`, rejecting anything
 * that escapes it or passes through a hidden directory.
 */
export async function resolveContainedPath({
	root,
	target,
}: {
	root: string;
	target: string;
}): Promise<string> {
	const joined = path.isAbsolute(target) ? target : path.join(root, target);
	const resolved = await realpathNearestExisting(joined);
	const resolvedRoot = await realpathNearestExisting(root);
	if (!pathIsInside({ candidate: resolved, root: resolvedRoot })) {
		throw new Error(`${target} is outside the workspace root.`);
	}
	if (hasHiddenSegment({ candidate: resolved, root: resolvedRoot })) {
		throw new Error(`${target} is inside a hidden directory.`);
	}
	return resolved;
}

/**
 * The workspace root itself is never a valid session workspace: a session gets
 * `fileWrite: "allow"` over whatever it's given, and the root defaults to `$HOME`.
 * @throws If `candidate` resolves to `root`.
 */
export async function assertNotWorkspaceRoot({
	candidate,
	root,
}: {
	candidate: string;
	root: string;
}): Promise<void> {
	const resolvedRoot = await realpathNearestExisting(root);
	if (candidate === resolvedRoot) {
		throw new Error("Pick a folder inside the workspace root, not the root itself.");
	}
}

export type WorkspaceEntry = { name: string; kind: "directory" | "file" };

/** Direct children under `root`/`subpath`, hidden ones excluded, sorted by name. */
export async function listWorkspaceEntries({
	root,
	subpath,
}: {
	root: string;
	subpath: string;
}): Promise<WorkspaceEntry[]> {
	const dir = await resolveContainedPath({ root, target: subpath });
	const entries = await readdir(dir, { withFileTypes: true }).catch(() => {
		throw new Error("This folder no longer exists.");
	});
	return entries
		.filter((entry) => (entry.isDirectory() || entry.isFile()) && !entry.name.startsWith("."))
		.map(
			(entry) => ({ name: entry.name, kind: entry.isDirectory() ? "directory" : "file" }) as const,
		)
		.sort((a, b) => a.name.localeCompare(b.name));
}
