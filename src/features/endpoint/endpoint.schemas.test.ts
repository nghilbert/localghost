import { describe, expect, it } from "vitest";
import { createEndpointSchema, updateEndpointSchema } from "./endpoint.schemas";

describe("createEndpointSchema", () => {
	it("defaults the provider to openai", () => {
		const endpoint = createEndpointSchema.parse({ name: "Cloud", url: "https://api.example.com" });

		expect(endpoint.provider).toBe("openai");
	});
});

describe("updateEndpointSchema", () => {
	it("leaves the provider out of a patch that does not change it", () => {
		const patch = updateEndpointSchema.parse({ name: "Renamed" });

		expect(patch).toEqual({ name: "Renamed" });
	});
});
