import { type StreamChunk, toServerSentEventsResponse } from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { getOllamaUrl } from "#/lib/ollama.server";

const pullRequestSchema = z.object({
	forwardedProps: z.object({
		model: z.string().min(1),
		ollamaUrl: z.string().optional(),
	}),
});

/** Download progress for a single Ollama pull step, surfaced as an AG-UI CUSTOM event. */
type PullProgressValue = {
	status?: string;
	digest?: string;
	total?: number;
	completed?: number;
};

export const Route = createFileRoute("/api/cookbook/pull")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const parsed = pullRequestSchema.safeParse(await request.json());
				if (!parsed.success) return new Response("model is required", { status: 400 });

				const { model } = parsed.data.forwardedProps;
				const ollamaUrl =
					parsed.data.forwardedProps.ollamaUrl?.replace(/\/+$/, "") ??
					(await getOllamaUrl(session.user.id));

				const ollamaRes = await fetch(`${ollamaUrl}/api/pull`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name: model, stream: true }),
				}).catch((err: Error) => {
					throw new Error(`Cannot reach Ollama at ${ollamaUrl}: ${err.message}`);
				});

				if (!ollamaRes.ok || !ollamaRes.body) {
					return new Response(`Ollama error: ${ollamaRes.statusText}`, {
						status: ollamaRes.status,
					});
				}

				const ollamaBody = ollamaRes.body;
				const threadId = crypto.randomUUID();
				const runId = crypto.randomUUID();

				// Proxy Ollama's NDJSON pull stream as AG-UI events: each progress line becomes a
				// CUSTOM "progress" event; completion ends the run, errors surface as RUN_ERROR.
				async function* events(): AsyncGenerator<StreamChunk> {
					const reader = ollamaBody.getReader();
					const dec = new TextDecoder();
					let buf = "";

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						buf += dec.decode(value, { stream: true });
						const lines = buf.split("\n");
						buf = lines.pop() ?? "";
						for (const line of lines) {
							if (!line.trim()) continue;
							let chunk: PullProgressValue & { error?: string };
							try {
								chunk = JSON.parse(line);
							} catch {
								continue; // skip malformed NDJSON lines
							}
							if (chunk.error) {
								yield { type: EventType.RUN_ERROR, message: chunk.error };
								return;
							}
							if (chunk.status === "success") {
								yield { type: EventType.RUN_FINISHED, threadId, runId };
								return;
							}
							const value: PullProgressValue = {
								status: chunk.status,
								digest: chunk.digest,
								total: chunk.total,
								completed: chunk.completed,
							};
							yield { type: EventType.CUSTOM, name: "progress", value };
						}
					}
					yield { type: EventType.RUN_FINISHED, threadId, runId };
				}

				return toServerSentEventsResponse(events());
			},
		},
	},
});
