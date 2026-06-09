export type Slot = { id: number; endpointId: string; model: string };
export type SlotState = { text: string; done: boolean; error: string | null };

let seq = 0;
export function nextSlotId() {
	return ++seq;
}
