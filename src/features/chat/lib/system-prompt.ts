const WEB_SEARCH_DIRECTIVE =
	"The user enabled web search for this message. Use the web_search tool when current or " +
	"external information would improve the answer.";

/** The current date and time in the user's timezone, or the server's when it is missing or invalid. */
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

/** The system prompt for one request: the date and time, the user's prompt, and a web search hint when enabled. */
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
