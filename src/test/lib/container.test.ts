import { describe, expect, it } from "vitest";
import { containerVariants } from "#/shared/components/ui/container";

const SIZES = [
	"xs",
	"sm",
	"md",
	"lg",
	"xl",
	"2xl",
	"3xl",
	"4xl",
	"5xl",
	"6xl",
	"7xl",
	"full",
] as const;

describe("containerVariants", () => {
	it("maps every size to the identically named Tailwind max-width", () => {
		for (const size of SIZES) {
			expect(containerVariants({ size }).split(" ")).toContain(`max-w-${size}`);
		}
	});

	it("leaves the column uncapped when no size is given", () => {
		expect(containerVariants()).not.toMatch(/max-w-/);
	});

	it("always centers and fills the space it is offered", () => {
		const classes = containerVariants({ size: "4xl" }).split(" ");
		expect(classes).toContain("mx-auto");
		expect(classes).toContain("w-full");
	});
});
