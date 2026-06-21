import { z } from "zod/v4";
import { prisma } from "#/lib/db.server";

export const searchChatsArgsSchema = z.object({
	query: z.string().optional(),
	limit: z.coerce.number().optional(),
});

type ChatRow = { title: string; snippet: string | null };

/**
 * Lists or searches the user's *saved* past conversations — excluding the
 * current chat and unnamed ("New Chat") drafts, preferring the assistant's reply
 * as the snippet rather than echoing the user's own words. With no query it
 * returns the most recent saved chats, so open-ended "what did we talk about?"
 * works; with a query it filters by keyword.
 */
export async function searchChats(
	query: string,
	ownerId: string,
	currentConversationId: string,
	limit = 10,
): Promise<string> {
	const cap = Math.min(limit, 30);
	const trimmed = query.trim();
	const like = `%${trimmed}%`;

	const rows = trimmed
		? await prisma.$queryRaw<ChatRow[]>`
			SELECT c.title AS "title",
			       COALESCE(
			         (SELECT part->>'content'
			          FROM jsonb_array_elements(c.messages) AS msg,
			               jsonb_array_elements(msg->'parts') AS part
			          WHERE part->>'type' = 'text' AND msg->>'role' = 'assistant'
			            AND part->>'content' ILIKE ${like}
			          LIMIT 1),
			         (SELECT part->>'content'
			          FROM jsonb_array_elements(c.messages) AS msg,
			               jsonb_array_elements(msg->'parts') AS part
			          WHERE part->>'type' = 'text' AND part->>'content' ILIKE ${like}
			          LIMIT 1)
			       ) AS snippet
			FROM conversation c
			WHERE c.owner_id = ${ownerId}::uuid
			  AND c.archived = false
			  AND c.id <> ${currentConversationId}::uuid
			  AND c.title <> 'New Chat'
			  AND EXISTS (
			    SELECT 1 FROM jsonb_array_elements(c.messages) AS msg,
			                  jsonb_array_elements(msg->'parts') AS part
			    WHERE part->>'type' = 'text' AND part->>'content' ILIKE ${like}
			  )
			ORDER BY c.updated_at DESC
			LIMIT ${cap}
		`
		: await prisma.$queryRaw<ChatRow[]>`
			SELECT c.title AS "title",
			       COALESCE(
			         (SELECT part->>'content'
			          FROM jsonb_array_elements(c.messages) AS msg,
			               jsonb_array_elements(msg->'parts') AS part
			          WHERE part->>'type' = 'text' AND msg->>'role' = 'assistant'
			          LIMIT 1),
			         (SELECT part->>'content'
			          FROM jsonb_array_elements(c.messages) AS msg,
			               jsonb_array_elements(msg->'parts') AS part
			          WHERE part->>'type' = 'text'
			          LIMIT 1)
			       ) AS snippet
			FROM conversation c
			WHERE c.owner_id = ${ownerId}::uuid
			  AND c.archived = false
			  AND c.id <> ${currentConversationId}::uuid
			  AND c.title <> 'New Chat'
			ORDER BY c.updated_at DESC
			LIMIT ${cap}
		`;

	if (rows.length === 0) {
		return trimmed
			? `No saved conversations mention "${trimmed}".`
			: "You don't have any saved past conversations yet.";
	}

	return rows
		.map((m) => {
			const snippet = (m.snippet ?? "").slice(0, 150).replace(/\s+/g, " ").trim();
			return `[${m.title}]: ${snippet}…`;
		})
		.join("\n\n");
}
