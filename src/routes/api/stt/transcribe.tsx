import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

export const Route = createFileRoute("/api/stt/transcribe")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });
				const userId = session.user.id;

				const contentType = request.headers.get("content-type") ?? "";
				if (!contentType.includes("multipart/form-data")) {
					return new Response("Expected multipart/form-data", { status: 400 });
				}

				let formData: FormData;
				try {
					formData = await request.formData();
				} catch {
					return new Response("Invalid form data", { status: 400 });
				}

				const file = formData.get("file");
				if (!file || typeof file === "string") {
					return new Response("Missing audio file", { status: 400 });
				}

				const audioBlob = file as File;
				if (audioBlob.size > MAX_AUDIO_BYTES) {
					return new Response("Audio file too large (max 25 MB)", { status: 413 });
				}

				// Find the user's first enabled endpoint that supports transcriptions
				const endpoint = await prisma.modelEndpoint.findFirst({
					where: { ownerId: userId },
					orderBy: { createdAt: "asc" },
				});

				if (!endpoint) {
					return new Response("No LLM endpoint configured", { status: 503 });
				}

				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
				const transcribeUrl = `${endpoint.url.replace(/\/$/, "")}/v1/audio/transcriptions`;

				const outForm = new FormData();
				outForm.append("file", audioBlob, audioBlob.name || "audio.webm");
				outForm.append("model", "whisper-1");

				const headers: Record<string, string> = {};
				if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

				let upstream: Response;
				try {
					upstream = await fetch(transcribeUrl, {
						method: "POST",
						headers,
						body: outForm,
					});
				} catch (err) {
					return Response.json(
						{ error: `Upstream request failed: ${(err as Error).message}` },
						{ status: 502 },
					);
				}

				if (!upstream.ok) {
					const text = await upstream.text().catch(() => "");
					return Response.json(
						{ error: `Upstream error ${upstream.status}: ${text}` },
						{ status: 502 },
					);
				}

				const result = (await upstream.json()) as { text?: string };
				return Response.json({ text: result.text ?? "" });
			},
		},
	},
});
