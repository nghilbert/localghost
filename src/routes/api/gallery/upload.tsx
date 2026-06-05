import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export const Route = createFileRoute("/api/gallery/upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const formData = await request.formData();
				const file = formData.get("file");
				if (!(file instanceof File)) return new Response("No file", { status: 400 });

				const ext = file.name.split(".").pop() ?? "bin";
				const safeName = `${session.user.id}-${Date.now()}.${ext}`;
				const dest = join(UPLOADS_DIR, safeName);

				await mkdir(UPLOADS_DIR, { recursive: true });
				const buf = await file.arrayBuffer();
				await writeFile(dest, Buffer.from(buf));

				return Response.json({ path: `/uploads/${safeName}`, name: file.name });
			},
		},
	},
});
