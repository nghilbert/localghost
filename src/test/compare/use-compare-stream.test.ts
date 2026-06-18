import { describe, expect, it } from "vitest";
import { nextSlotId, type Slot } from "#/features/compare/lib/types";

describe("nextSlotId", () => {
	it("returns a unique integer on each call", () => {
		const a = nextSlotId();
		const b = nextSlotId();
		const c = nextSlotId();
		expect(typeof a).toBe("number");
		expect(b).toBeGreaterThan(a);
		expect(c).toBeGreaterThan(b);
	});
});

describe("Slot type", () => {
	it("holds endpointId, model, and conversationId", () => {
		const slot: Slot = {
			id: nextSlotId(),
			endpointId: "ep-1",
			model: "gpt-4o",
			conversationId: null,
		};
		expect(slot.conversationId).toBeNull();

		const configured: Slot = { ...slot, conversationId: "conv-abc" };
		expect(configured.conversationId).toBe("conv-abc");
	});
});
