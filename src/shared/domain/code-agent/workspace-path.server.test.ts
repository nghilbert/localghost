import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
	getCodeAgentWorkspaceRoot,
	listWorkspaceEntries,
	pathIsInside,
	resolveContainedPath,
} from "#/shared/domain/code-agent/workspace-path.server";

describe("pathIsInside", () => {
	it("accepts the root itself and anything beneath it", () => {
		expect(pathIsInside({ candidate: "/srv/work", root: "/srv/work" })).toBe(true);
		expect(pathIsInside({ candidate: "/srv/work/repo", root: "/srv/work" })).toBe(true);
	});

	it("rejects a sibling that merely shares the root's name prefix", () => {
		expect(pathIsInside({ candidate: "/srv/work-evil", root: "/srv/work" })).toBe(false);
	});

	it("rejects a path above the root", () => {
		expect(pathIsInside({ candidate: "/srv", root: "/srv/work" })).toBe(false);
	});
});

describe("getCodeAgentWorkspaceRoot", () => {
	let base: string;

	beforeAll(async () => {
		base = await mkdtemp(path.join(os.tmpdir(), "localghost-workspace-root-"));
	});
	afterAll(async () => {
		await rm(base, { recursive: true, force: true });
	});
	afterEach(() => {
		delete process.env.CODE_AGENT_WORKSPACE_ROOT;
		vi.restoreAllMocks();
	});

	it("uses CODE_AGENT_WORKSPACE_ROOT when set, creating it if missing", async () => {
		const root = path.join(base, "configured");
		process.env.CODE_AGENT_WORKSPACE_ROOT = root;
		await expect(getCodeAgentWorkspaceRoot()).resolves.toBe(root);
	});

	it("defaults to the user's home directory", async () => {
		vi.spyOn(os, "homedir").mockReturnValue(base);
		await expect(getCodeAgentWorkspaceRoot()).resolves.toBe(base);
	});
});

describe("resolveContainedPath", () => {
	let root: string;
	let outside: string;

	beforeAll(async () => {
		const base = await mkdtemp(path.join(os.tmpdir(), "localghost-workspace-path-"));
		root = path.join(base, "root");
		outside = path.join(base, "root-evil");
		await mkdir(path.join(root, "project"), { recursive: true });
		await mkdir(outside, { recursive: true });
		await symlink(outside, path.join(root, "escape"));
	});
	afterAll(async () => {
		await rm(path.dirname(root), { recursive: true, force: true });
	});

	it("resolves a relative subpath inside the root", async () => {
		await expect(resolveContainedPath({ root, target: "project" })).resolves.toBe(
			path.join(root, "project"),
		);
	});

	it("resolves an absolute path already inside the root", async () => {
		await expect(resolveContainedPath({ root, target: path.join(root, "project") })).resolves.toBe(
			path.join(root, "project"),
		);
	});

	it("allows a not-yet-created target inside the root", async () => {
		await expect(resolveContainedPath({ root, target: "new-project" })).resolves.toBe(
			path.join(root, "new-project"),
		);
	});

	it("rejects a name-prefix sibling", async () => {
		await expect(resolveContainedPath({ root, target: outside })).rejects.toThrow();
	});

	it("rejects a parent-directory escape", async () => {
		await expect(resolveContainedPath({ root, target: ".." })).rejects.toThrow();
	});

	it("rejects a symlink pointing out of the root", async () => {
		await expect(resolveContainedPath({ root, target: "escape" })).rejects.toThrow();
	});
});

describe("listWorkspaceEntries", () => {
	let root: string;

	beforeAll(async () => {
		root = await mkdtemp(path.join(os.tmpdir(), "localghost-workspace-entries-"));
		await mkdir(path.join(root, "project-b"));
		await mkdir(path.join(root, "project-a"));
		await mkdir(path.join(root, ".hidden"));
		await writeFile(path.join(root, "not-a-folder.txt"), "");
	});
	afterAll(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it("lists only visible subdirectories, sorted", async () => {
		await expect(listWorkspaceEntries({ root, subpath: "" })).resolves.toEqual([
			"project-a",
			"project-b",
		]);
	});

	it("throws for a subpath that doesn't exist", async () => {
		await expect(listWorkspaceEntries({ root, subpath: "nope" })).rejects.toThrow();
	});
});
