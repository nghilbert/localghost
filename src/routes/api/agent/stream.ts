import { reconstructChat } from "@tanstack/ai-persistence";
import { createFileRoute } from "@tanstack/react-router";
import { chatPersistence, findRunThreadId } from "#/shared/domain/chat/persistence.server";
import {
	codeAgentSessionOwnedBy,
	findCodeAgentSessionWithEndpoint,
} from "#/shared/domain/code-agent/code-agent.server";
import { approvalCommandTarget } from "#/shared/domain/code-agent/policy.server";
import { streamCodeAgentEvents } from "#/shared/domain/code-agent/run.server";
import {
	codeAgentModelSchema,
	codeAgentStreamForwardedPropsSchema,
	codeAgentThreadIdSchema,
} from "#/shared/domain/code-agent/schemas";
import {
	getCodeAgentWorkspaceRoot,
	resolveContainedPath,
} from "#/shared/domain/code-agent/workspace-path.server";
import { endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { asLLMProvider, detectProvider } from "#/shared/lib/llm/provider";
import {
	readRunParams,
	resumeRunResponse,
	streamRunResponse,
} from "#/shared/lib/llm/stream.server";
import { authedRequest } from "#/shared/lib/middleware";

// Roomy enough for a full history; an agent transcript carries no image attachments.
const MAX_BODY_BYTES = 16 * 1024 * 1024;

/**
 * The code-agent stream. The session id *is* the AG-UI thread id: `params.threadId` names
 * the session and owning it is the gate, so the only forwarded props are the command
 * approvals the user granted for this run.
 */
export const Route = createFileRoute("/api/agent/stream")({
	server: {
		middleware: [authedRequest],
		handlers: {
			POST: async ({ request, context: { userId } }) => {
				const read = await readRunParams({ request, maxBytes: MAX_BODY_BYTES });
				if (!read.ok) return read.response;
				const { params } = read;

				const threadId = codeAgentThreadIdSchema.safeParse(params.threadId);
				if (!threadId.success) return new Response("Bad request", { status: 400 });

				const forwarded = codeAgentStreamForwardedPropsSchema.safeParse(params.forwardedProps);
				if (!forwarded.success) return new Response("Bad request", { status: 400 });
				// Widens this run's policy only. Ids naming anything but a command drop out,
				// and the grant is gone with the run, so nothing carries into the next turn.
				const approvedCommands = forwarded.data.approvedApprovalIds
					.map(approvalCommandTarget)
					.filter((command) => command !== null);

				const session = await findCodeAgentSessionWithEndpoint({
					id: threadId.data,
					ownerId: userId,
				});
				if (!session) return new Response("Session not found", { status: 404 });

				// Re-checked per run, not just at creation: narrowing the workspace root or
				// tightening the model rule has to bind sessions that already exist.
				const model = codeAgentModelSchema.safeParse(session.model);
				if (!model.success) return new Response("Session has an unusable model", { status: 400 });
				try {
					const root = await getCodeAgentWorkspaceRoot();
					await resolveContainedPath({ root, target: session.workspacePath });
				} catch {
					return new Response("Session workspace is no longer allowed", { status: 403 });
				}

				const apiKey = endpointApiKey(session.endpoint);
				const endpointProvider =
					asLLMProvider(session.endpoint.provider) ?? detectProvider(session.endpoint.url);
				// A self-hosted llama.cpp endpoint has no key to configure; the rest do.
				if (!apiKey && endpointProvider !== "llamacpp") {
					return new Response("Endpoint has no API key configured", { status: 400 });
				}

				return streamRunResponse({
					request,
					runId: params.runId,
					runs: chatPersistence.stores.runs,
					run: (abortController) =>
						streamCodeAgentEvents({
							workspacePath: session.workspacePath,
							model: model.data,
							apiKey: apiKey ?? "",
							endpointUrl: session.endpoint.url,
							endpointProvider,
							approvedCommands,
							threadId: threadId.data,
							runId: params.runId,
							messages: params.messages,
							resume: params.resume,
							abortController,
						}),
				});
			},
			GET: async ({ request, context: { userId } }) => {
				if (new URL(request.url).searchParams.has("threadId")) {
					return reconstructChat(chatPersistence, request, {
						authorize: (threadId) => codeAgentSessionOwnedBy({ id: threadId, ownerId: userId }),
					});
				}
				return resumeRunResponse({
					request,
					findThreadId: findRunThreadId,
					authorize: (threadId) => codeAgentSessionOwnedBy({ id: threadId, ownerId: userId }),
				});
			},
		},
	},
});
