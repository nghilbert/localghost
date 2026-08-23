import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chat, type ModelMessage, type RunAgentResumeItem, type StreamChunk } from "@tanstack/ai";
import { claudeCodeText } from "@tanstack/ai-claude-code";
import type { UIMessage } from "@tanstack/ai-client";
import { withPersistence } from "@tanstack/ai-persistence";
import {
	createSecrets,
	defineSandbox,
	defineWorkspace,
	localSource,
	type SandboxDefinition,
	withSandbox,
} from "@tanstack/ai-sandbox";
import { localProcessSandbox } from "@tanstack/ai-sandbox-local-process";
import { chatPersistence } from "#/shared/domain/chat/persistence.server";
import { LOCAL_LLAMACPP_API_KEY } from "#/shared/lib/llamacpp/client.server";
import { chatBaseUrl } from "#/shared/lib/llm/client.server";
import type { LLMProvider } from "#/shared/lib/llm/provider";
import { scrubbedEnvKeys } from "./env.server";
import { buildCodeAgentPolicy, renameApprovalChunks } from "./policy.server";

/** Caps a runaway harness loop; the chat surface bounds its agent rounds the same way. */
const MAX_HARNESS_TURNS = 60;

/**
 * The env a Claude Code run needs, from the session's endpoint. `ANTHROPIC_BASE_URL`
 * points the CLI at a non-Anthropic backend; llama.cpp serves the Messages API with
 * its jinja template engine on.
 */
function harnessEnv({
	apiKey,
	endpointUrl,
	endpointProvider,
}: {
	apiKey: string;
	endpointUrl: string;
	endpointProvider: LLMProvider;
}): Record<string, string> {
	const key = apiKey || (endpointProvider === "llamacpp" ? LOCAL_LLAMACPP_API_KEY : "");
	if (endpointProvider === "anthropic") return { ANTHROPIC_API_KEY: key };
	return {
		ANTHROPIC_API_KEY: key,
		ANTHROPIC_BASE_URL: chatBaseUrl({ url: endpointUrl, provider: "anthropic" }),
	};
}

/**
 * The sandbox a session runs in, against the real `workspacePath`. There is no copy:
 * the local-process provider leaves a fixed `dir` in place on destroy.
 */
function buildCodeAgentSandbox({
	threadId,
	workspacePath,
	injected,
	approvedCommands,
}: {
	threadId: string;
	workspacePath: string;
	injected: Record<string, string>;
	approvedCommands: string[];
}): SandboxDefinition {
	return defineSandbox({
		id: threadId,
		provider: localProcessSandbox({
			dir: workspacePath,
			scrubEnv: scrubbedEnvKeys({ injected }),
		}),
		workspace: defineWorkspace({
			source: localSource(workspacePath),
			secrets: createSecrets(injected),
		}),
		policy: buildCodeAgentPolicy({ approvedCommands }),
		lifecycle: { reuse: "thread", destroyOnComplete: false },
	});
}

/** Where {@link ensureClaudeSessionConfig} keeps a session's Claude Code settings. */
function claudeConfigDir(threadId: string): string {
	return path.join(os.tmpdir(), "localghost-code-agent", threadId);
}

/**
 * A scratch `CLAUDE_CONFIG_DIR` for settings `claude` only honors from `settings.json`,
 * so they never touch the user's own `~/.claude`. `autoAllowBashIfSandboxed` stays
 * false: the approval gate is the product's control, not the OS boundary.
 */
async function ensureClaudeSessionConfig({
	threadId,
	workspacePath,
	endpointProvider,
}: {
	threadId: string;
	workspacePath: string;
	endpointProvider: LLMProvider;
}): Promise<string> {
	const dir = claudeConfigDir(threadId);
	await mkdir(dir, { recursive: true });
	await writeFile(
		path.join(dir, "settings.json"),
		JSON.stringify({
			...(endpointProvider === "llamacpp" ? { env: { CLAUDE_CODE_ATTRIBUTION_HEADER: "0" } } : {}),
			sandbox: {
				enabled: true,
				autoAllowBashIfSandboxed: false,
				filesystem: { allowWrite: [workspacePath] },
			},
		}),
	);
	return dir;
}

/** Tears down the sandbox behind a session, if one is still running. */
export async function destroyCodeAgentSandbox({
	threadId,
	workspacePath,
}: {
	threadId: string;
	workspacePath: string;
}): Promise<void> {
	const sandboxDef = buildCodeAgentSandbox({
		threadId,
		workspacePath,
		injected: {},
		approvedCommands: [],
	});
	await sandboxDef.destroy({ threadId, runId: "" });
	await rm(claudeConfigDir(threadId), { recursive: true, force: true });
}

export interface StreamCodeAgentOptions {
	workspacePath: string;
	model: string;
	apiKey: string;
	/** The session's endpoint, used to point the harness at a non-default backend. */
	endpointUrl: string;
	endpointProvider: LLMProvider;
	/** Commands the user has already approved for this session. */
	approvedCommands: string[];
	threadId: string;
	runId?: string;
	/** The posted transcript. Empty falls back to the stored thread. */
	messages: Array<UIMessage | ModelMessage>;
	abortController?: AbortController;
	resume?: RunAgentResumeItem[];
}

/**
 * Runs the session's harness against `workspacePath`. Both the adapter's `cwd` and the
 * workspace source resolve to the conventional `/workspace` root, which the
 * local-process provider maps onto the real directory.
 */
export async function* streamCodeAgentEvents(
	opts: StreamCodeAgentOptions,
): AsyncGenerator<StreamChunk> {
	const injected = harnessEnv(opts);
	const sandboxDef = buildCodeAgentSandbox({
		threadId: opts.threadId,
		workspacePath: opts.workspacePath,
		injected,
		approvedCommands: opts.approvedCommands,
	});

	// `permissionMode: "default"` instead of the adapter's `bypassPermissions`, so the
	// sandbox policy is consulted at all. `emitDiff` off: nothing renders the diff, and
	// it costs a `git diff` after every run.
	const adapter = claudeCodeText(opts.model, {
		permissionMode: "default",
		emitDiff: false,
		maxTurns: MAX_HARNESS_TURNS,
		env: {
			CLAUDE_CONFIG_DIR: await ensureClaudeSessionConfig({
				threadId: opts.threadId,
				workspacePath: opts.workspacePath,
				endpointProvider: opts.endpointProvider,
			}),
		},
	});

	yield* renameApprovalChunks(
		chat({
			adapter,
			threadId: opts.threadId,
			runId: opts.runId,
			// Non-empty wins over the stored thread, which is how a follow-up message and
			// an approval decision both reach the harness.
			messages: opts.messages,
			...(opts.abortController ? { abortController: opts.abortController } : {}),
			...(opts.resume ? { resume: opts.resume } : {}),
			middleware: [withPersistence(chatPersistence), withSandbox(sandboxDef)],
			stream: true,
		}),
	);
}
