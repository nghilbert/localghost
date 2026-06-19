import { z } from "zod/v4";
import { prisma } from "#/lib/db.server";

export const searchChatsArgsSchema = z.object({
	query: z.string().optional(),
	limit: z.coerce.number().optional(),
});

export async function searchChats(query: string, ownerId: string, limit = 10): Promise<string> {
	if (!query.trim()) return "query is required";

	// Substring search over each conversation's `messages` blob, matching the text
	// content of any message part via a read-time JSONB traversal.
	const results = await prisma.$queryRaw<Array<{ title: string; snippet: string | null }>>`
		SELECT c.title AS "title",
		       (
		         SELECT part->>'content'
		         FROM jsonb_array_elements(c.messages) AS msg,
		              jsonb_array_elements(msg->'parts') AS part
		         WHERE part->>'type' = 'text'
		           AND part->>'content' ILIKE ${`%${query}%`}
		         LIMIT 1
		       ) AS snippet
		FROM conversation c
		WHERE c.owner_id = ${ownerId}::uuid
		  AND EXISTS (
		    SELECT 1
		    FROM jsonb_array_elements(c.messages) AS msg,
		         jsonb_array_elements(msg->'parts') AS part
		    WHERE part->>'type' = 'text'
		      AND part->>'content' ILIKE ${`%${query}%`}
		  )
		ORDER BY c.updated_at DESC
		LIMIT ${Math.min(limit, 30)}
	`;

	if (results.length === 0) return `No messages found matching "${query}".`;

	return results
		.map((m) => {
			const snippet = (m.snippet ?? "").slice(0, 150).replace(/\n/g, " ");
			return `[${m.title}]: ${snippet}…`;
		})
		.join("\n\n");
}
