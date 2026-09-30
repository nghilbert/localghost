import { createFileRoute } from "@tanstack/react-router";
import { MemoryTab } from "#/features/memory/components/MemoryTab";
import { memoryQueries } from "#/features/memory/memory.queries";

export const Route = createFileRoute("/_authenticated/settings/memory")({
	// Chats save memories, so this refetches on every visit.
	loader: ({ context }) => context.queryClient.query(memoryQueries.list()),
	component: MemoryTab,
});
