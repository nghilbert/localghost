/** A provider error explained for the chat, with what the user can do about it. */
type ChatFailure = {
	title: string;
	description: string;
	/** What the alert offers: try again, pick another model in the Library, or nothing that would help. */
	remedy: "retry" | "library" | "none";
};

/** Explains a chat run's error message. A crashed local model shows as `unexpected EOF`. */
export function describeChatError(message: string): ChatFailure {
	// llama.cpp's router: "model name=<id> failed to load"; a GPU out of memory shows as a lost device.
	if (/failed to load|out of (device )?memory|device.?lost|ErrorOutOfDeviceMemory/i.test(message)) {
		return {
			title: "The model couldn't load",
			description:
				"It probably doesn't fit in this machine's memory. Pick a smaller model or quantization in the Library.",
			remedy: "library",
		};
	}
	if (/unexpected eof|core dumped|aborted|econnreset|fetch failed/i.test(message)) {
		return {
			title: "The model stopped unexpectedly",
			description:
				"The model runner crashed mid-response and is likely reloading. Give it a few seconds, then try again.",
			remedy: "retry",
		};
	}
	// OpenAI-compat: "does not support tools"; OpenRouter: "No endpoints found that support tool use".
	if (
		/(not |n't )support(s|ed)? tool|tools? (is |are |use )?not supported|no endpoints found that support tool/i.test(
			message,
		)
	) {
		return {
			title: "This model can't use tools",
			description:
				"Turn the tools off in the Tools menu for this message, or switch to a tool-capable model, then try again.",
			remedy: "retry",
		};
	}
	// The stream route's own refusals reach the client as a bare status; its response body is dropped.
	const routeStatus = /^HTTP error! status: (\d+)/.exec(message)?.[1];
	if (routeStatus === "401") {
		return {
			title: "Your session expired",
			description: "Refresh the page and sign in again to keep chatting.",
			remedy: "none",
		};
	}
	if (routeStatus === "413") {
		return {
			title: "This message is too large",
			description: "Edit it to remove an attachment or two, then send it again.",
			remedy: "none",
		};
	}
	if (routeStatus === "409") {
		return {
			title: "This chat has no model",
			description: "Its endpoint was removed. Start a new chat with a model from the Library.",
			remedy: "library",
		};
	}
	if (/unauthorized|\b401\b|invalid api key/i.test(message)) {
		return {
			title: "The endpoint rejected its API key",
			description: "Update the key for this endpoint in Settings, then try again.",
			remedy: "retry",
		};
	}
	return { title: "Something went wrong", description: message, remedy: "retry" };
}
