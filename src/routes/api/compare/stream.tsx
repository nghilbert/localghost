import { toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { streamLLMEvents } from "#/lib/llm.server";

/**
 * The AG-UI body `@tanstack/ai-client`'s SSE adapter POSTs for a compare slot.
 * The prompt rides as the latest user message; the slot's endpoint and model
 * are forwarded under `forwardedProps`.
 */
const compareStreamRequestSchema = z.object({
	messages: z.array(
		z.object({
			role: z.string(),
			content: z.union([
				z.string(),
				z.array(z.object({ type: z.string(), content: z.string().optional() })),
			]),
		}),
	),
	forwardedProps: z.object({ endpointId: z.uuid(), model: z.string().min(1) }),
});

/** Flattens an AG-UI wire message's content (string or content parts) to plain text. */
function wireContentToText(content: string | Array<{ type: string; content?: string }>): string {
	if (typeof content === "string") return content;
	return content
		.filter((part) => part.type === "text" && typeof part.content === "string")
		.map((part) => part.content ?? "")
		.join("");
}

export const Route = createFileRoute("/api/compare/stream")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const parsed = compareStreamRequestSchema.safeParse(await request.json());
				if (!parsed.success) return new Response("Bad request", { status: 400 });

				const { endpointId, model } = parsed.data.forwardedProps;
				const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
				const prompt = lastUser ? wireContentToText(lastUser.content).trim() : "";
				if (!prompt) return new Response("Bad request", { status: 400 });

				const endpoint = await prisma.modelEndpoint.findFirst({
					where: { id: endpointId, ownerId: session.user.id },
				});
				if (!endpoint) return new Response("Endpoint not found", { status: 404 });

				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;

				return toServerSentEventsResponse(
					streamLLMEvents({
						url: endpoint.url,
						apiKey,
						model,
						messages: [{ role: "user", content: prompt }],
					}),
				);
			},
		},
	},
});
