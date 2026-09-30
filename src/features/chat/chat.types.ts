import type { ModelMessage } from "@tanstack/ai";
import type { getConversation } from "./chat.functions";

/** A conversation as the query cache holds it: the row with `messages` typed. */
export type ConversationDetail = Omit<Awaited<ReturnType<typeof getConversation>>, "messages"> & {
	messages: ModelMessage[];
};

/** The tool switches and whether the model can use them. */
export type ToolControls = {
	/** The tool ids turned on for the next message. */
	enabledTools: string[];
	supportsTools: boolean;
	onEnabledToolsChange: (enabledTools: string[]) => void;
};
