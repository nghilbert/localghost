import type { ModelMessage } from "@tanstack/ai";
import type { InterruptRecord } from "@tanstack/ai-persistence";

declare global {
	namespace PrismaJson {
		/** `ChatThread.messages`: the whole transcript. Dates are stored as strings. */
		type ChatTranscript = ModelMessage[];
		/** `ChatInterrupt.payload`. */
		type InterruptPayload = InterruptRecord["payload"];
		/** `ChatInterrupt.response`. */
		type InterruptResponse = InterruptRecord["response"];
	}
}
