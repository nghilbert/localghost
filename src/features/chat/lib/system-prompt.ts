const WEB_SEARCH_DIRECTIVE =
	"The user enabled web search for this message. Use the web_search tool when current or " +
	"external information would improve the answer.";

/**
 * Grounds the model in the current date and time, formatted for the client's
 * timezone. An invalid or missing zone falls back to the server's.
 */
export function currentDateTimeLine(timeZone?: string): string {
	const format: Intl.DateTimeFormatOptions = { dateStyle: "full", timeStyle: "long" };
	let now: string;
	try {
		now = new Date().toLocaleString("en-US", { ...format, timeZone });
	} catch {
		now = new Date().toLocaleString("en-US", format);
	}
	return `Current date and time: ${now}. This timestamp is live and correct; answer time questions from it directly.`;
}

/**
 * Composes the per-request system prompt: date/time grounding, the user's own
 * prompt, and a search directive when web search is enabled for this send.
 */
export function buildChatSystemPrompt({
	userPrompt,
	enabledTools,
	timeZone,
}: {
	userPrompt?: string | null;
	enabledTools: string[];
	timeZone?: string;
}): string {
	return [
		currentDateTimeLine(timeZone),
		userPrompt?.trim(),
		enabledTools.includes("web_search") && WEB_SEARCH_DIRECTIVE,
	]
		.filter(Boolean)
		.join("\n\n");
}
