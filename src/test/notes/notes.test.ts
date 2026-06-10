import { describe, expect, it } from "vitest";
import { NOTE_COLORS, noteColorClasses } from "#/features/notes/lib/types";

describe("NOTE_COLORS", () => {
	it("has a default entry with null value", () => {
		const def = NOTE_COLORS.find((c) => c.value === null);
		expect(def).toBeDefined();
		expect(def?.label).toBe("Default");
	});

	it("all entries have label, bg, and border", () => {
		for (const c of NOTE_COLORS) {
			expect(c.label).toBeTruthy();
			expect(c.bg).toBeTruthy();
			expect(c.border).toBeTruthy();
		}
	});

	it("non-default colors have hex values", () => {
		for (const c of NOTE_COLORS) {
			if (c.value !== null) {
				expect(c.value).toMatch(/^#[0-9a-f]{6}$/i);
			}
		}
	});
});

describe("noteColorClasses", () => {
	it("returns bg-card border-border for null (default)", () => {
		expect(noteColorClasses(null)).toBe("bg-card border-border");
	});

	it("returns the matching color's bg and border classes", () => {
		const red = NOTE_COLORS.find((c) => c.label === "Red");
		if (!red) throw new Error("Red not found in NOTE_COLORS");
		const result = noteColorClasses(red.value);
		expect(result).toContain(red.bg);
		expect(result).toContain(red.border);
	});

	it("returns bg-card border-border for unrecognized hex", () => {
		expect(noteColorClasses("#deadbe")).toBe("bg-card border-border");
	});

	it("returns correct classes for every defined color value", () => {
		for (const color of NOTE_COLORS) {
			const result = noteColorClasses(color.value);
			if (color.value === null) {
				expect(result).toBe("bg-card border-border");
			} else {
				expect(result).toContain(color.bg);
				expect(result).toContain(color.border);
			}
		}
	});
});
