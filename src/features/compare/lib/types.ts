import type { UIMessage } from "@tanstack/ai-client";

export type Slot = {
	id: number;
	endpointId: string;
	model: string;
	conversationId: string | null;
};

export type SlotState = {
	messages: UIMessage[];
	status: "idle" | "submitted" | "streaming" | "ready" | "error";
};

let seq = 0;
export function nextSlotId() {
	return ++seq;
}
