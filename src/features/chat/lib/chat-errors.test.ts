import { describe, expect, it } from "vitest";
import { describeChatError } from "./chat-errors";

describe("describeChatError", () => {
	it.each([
		[
			"500 model name=ggml-org/gemma-4-E4B-it-GGUF:Q4_0 failed to load",
			"The model couldn't load",
			"library",
		],
		["vk::Queue::submit: ErrorDeviceLost", "The model couldn't load", "library"],
		["unexpected EOF", "The model stopped unexpectedly", "retry"],
		["400 this model does not support tools", "This model can't use tools", "retry"],
		["No endpoints found that support tool use", "This model can't use tools", "retry"],
		["HTTP error! status: 401 Unauthorized", "Your session expired", "none"],
		["HTTP error! status: 409 Conflict", "This chat has no model", "library"],
		["HTTP error! status: 413 Payload Too Large", "This message is too large", "none"],
		["401 Incorrect API key provided", "The endpoint rejected its API key", "retry"],
	])("explains %j", (message, title, remedy) => {
		expect(describeChatError(message)).toMatchObject({ title, remedy });
	});

	it("passes an unknown message through as the description", () => {
		expect(describeChatError("rate limited")).toEqual({
			title: "Something went wrong",
			description: "rate limited",
			remedy: "retry",
		});
	});
});
