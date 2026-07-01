/**
 * Typed router history state used to hand the very first message off from the
 * New-chat draft page to the freshly created conversation. The draft page holds no
 * DB row, so on send it creates the conversation, navigates to it with this state,
 * and the conversation view auto-sends the message once with the same tool choices.
 */
declare module "@tanstack/history" {
	interface HistoryState {
		firstMessage?: string;
		enabledTools?: string[];
		forceWebSearch?: boolean;
	}
}
