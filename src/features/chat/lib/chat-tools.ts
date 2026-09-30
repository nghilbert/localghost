import type { BoundInterrupts } from "@tanstack/ai-client";
import { deleteMemoryToolDef } from "#/features/memory/memory.schemas";

/** Tool definitions without handlers, so `useChat` can type approval requests. The server runs them. */
export const CHAT_TOOLS = [deleteMemoryToolDef] as const;

/** The pending approvals `useChat` reports for {@link CHAT_TOOLS}. */
export type ChatInterrupts = BoundInterrupts<typeof CHAT_TOOLS>;
