import type { BoundInterrupts } from "@tanstack/ai-client";
import { deleteMemoryToolDef } from "#/shared/domain/chat/tool-definitions";

/**
 * Client-declared tool stubs (no `execute`): the server owns execution, this
 * only gives `useChat` the tool types it needs to type approval interrupts.
 */
export const CHAT_TOOLS = [deleteMemoryToolDef] as const;

export type ChatInterrupts = BoundInterrupts<typeof CHAT_TOOLS>;
