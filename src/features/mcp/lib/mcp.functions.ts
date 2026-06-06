import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";
import { listMcpTools } from "#/lib/mcp.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getMcpServers = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.mcpServer.findMany({
		where: { ownerId: userId },
		orderBy: { createdAt: "asc" },
	});
});

export const createMcpServer = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			name: z.string().min(1).max(100),
			url: z.string().url().max(2048),
			type: z.enum(["streamable-http", "sse"]).default("streamable-http"),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.mcpServer.create({
			data: {
				name: data.name,
				url: data.url,
				type: data.type,
				ownerId: userId,
			},
		});
	});

export const updateMcpServer = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			name: z.string().min(1).max(100).optional(),
			url: z.string().url().max(2048).optional(),
			type: z.enum(["streamable-http", "sse"]).optional(),
			enabled: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.mcpServer.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		return prisma.mcpServer.update({
			where: { id: data.id },
			data: {
				...(data.name !== undefined ? { name: data.name } : {}),
				...(data.url !== undefined ? { url: data.url } : {}),
				...(data.type !== undefined ? { type: data.type } : {}),
				...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
			},
		});
	});

export const deleteMcpServer = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.mcpServer.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

/** Test connectivity to an MCP server and return its tool list. */
export const testMcpServer = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const server = await prisma.mcpServer.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!server) throw new Error("Not found");
		const tools = await listMcpTools(server);
		return {
			ok: tools.length > 0,
			tools: tools.map((t) => ({ name: t.originalName, description: t.description })),
		};
	});

export const mcpServersQueryOptions = () =>
	queryOptions({ queryKey: ["mcp-servers"], queryFn: () => getMcpServers() });
