import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

type ManifestEntry = { storedName: string; originalName: string; uploadedAt: string };

async function readManifest(userId: string): Promise<ManifestEntry[]> {
	const manifestPath = join(UPLOADS_DIR, `${userId}.json`);
	try {
		const raw = await readFile(manifestPath, "utf-8");
		return JSON.parse(raw) as ManifestEntry[];
	} catch {
		return [];
	}
}

async function writeManifest(userId: string, entries: ManifestEntry[]): Promise<void> {
	await mkdir(UPLOADS_DIR, { recursive: true });
	await writeFile(join(UPLOADS_DIR, `${userId}.json`), JSON.stringify(entries));
}

export const Route = createFileRoute("/api/gallery/upload")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const entries = await readManifest(session.user.id);
				const items = entries.map((e) => ({
					path: `/uploads/${e.storedName}`,
					name: e.originalName,
				}));
				return Response.json(items);
			},

			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const formData = await request.formData();
				const file = formData.get("file");
				if (!(file instanceof File)) return new Response("No file", { status: 400 });

				const ext = file.name.split(".").pop() ?? "bin";
				const storedName = `${session.user.id}-${Date.now()}.${ext}`;
				const dest = join(UPLOADS_DIR, storedName);

				await mkdir(UPLOADS_DIR, { recursive: true });
				const buf = await file.arrayBuffer();
				await writeFile(dest, Buffer.from(buf));

				const entries = await readManifest(session.user.id);
				entries.unshift({
					storedName,
					originalName: file.name,
					uploadedAt: new Date().toISOString(),
				});
				await writeManifest(session.user.id, entries);

				return Response.json({ path: `/uploads/${storedName}`, name: file.name });
			},

			DELETE: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const { path } = (await request.json()) as { path: string };
				const storedName = path.replace("/uploads/", "");

				if (!storedName.startsWith(session.user.id)) {
					return new Response("Forbidden", { status: 403 });
				}

				await rm(join(UPLOADS_DIR, storedName), { force: true });

				const entries = await readManifest(session.user.id);
				await writeManifest(
					session.user.id,
					entries.filter((e) => e.storedName !== storedName),
				);

				return new Response(null, { status: 204 });
			},
		},
	},
});
