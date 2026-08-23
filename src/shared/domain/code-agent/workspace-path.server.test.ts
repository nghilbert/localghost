import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	assertWorkspacePathAllowed,
	pathIsInside,
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

describe("assertWorkspacePathAllowed", () => {
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
	beforeEach(() => {
		process.env.CODE_AGENT_WORKSPACE_ROOT = root;
	});
	afterEach(() => {
		delete process.env.CODE_AGENT_WORKSPACE_ROOT;
	});

	it("allows a directory inside the root", async () => {
		await expect(assertWorkspacePathAllowed(path.join(root, "project"))).resolves.toBeUndefined();
	});

	it("rejects a name-prefix sibling", async () => {
		await expect(assertWorkspacePathAllowed(outside)).rejects.toThrow();
	});

	it("rejects a parent-directory escape", async () => {
		await expect(assertWorkspacePathAllowed(path.join(root, ".."))).rejects.toThrow();
	});

	it("rejects a symlink pointing out of the root", async () => {
		await expect(assertWorkspacePathAllowed(path.join(root, "escape"))).rejects.toThrow();
	});

	it("allows anything when the root is unset", async () => {
		delete process.env.CODE_AGENT_WORKSPACE_ROOT;
		await expect(assertWorkspacePathAllowed("/")).resolves.toBeUndefined();
	});
});
