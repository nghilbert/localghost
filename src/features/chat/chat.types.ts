import type { getConversation } from "./chat.functions";

/** A conversation as the query cache holds it. */
export type ConversationDetail = Awaited<ReturnType<typeof getConversation>>;

/** The tool switches and whether the model can use them. */
export type ToolControls = {
	/** The tool ids turned on for the next message. */
	enabledTools: string[];
	supportsTools: boolean;
	onEnabledToolsChange: (enabledTools: string[]) => void;
};
