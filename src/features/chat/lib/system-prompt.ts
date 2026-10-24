const WEB_SEARCH_DIRECTIVE =
	"The user enabled web search for this message. Use the web_search tool when current or " +
	"external information would improve the answer.";

/**
 * Today's date in the user's timezone, or the server's when it is missing or invalid. It leaves
 * out the time, so the prompt prefix stays the same all day and the provider's prompt cache keeps
 * matching.
 */
export function currentDateLine(timeZone?: string): string {
	const format: Intl.DateTimeFormatOptions = { dateStyle: "full" };
	let today: string;
	try {
		today = new Date().toLocaleDateString("en-US", { ...format, timeZone });
	} catch {
		today = new Date().toLocaleDateString("en-US", format);
	}
	return `Today's date: ${today}. Answer date questions from it directly.`;
}

/** The system prompt for one request: the date, the user's prompt, and a web search hint when enabled. */
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
		currentDateLine(timeZone),
		userPrompt?.trim(),
		enabledTools.includes("web_search") && WEB_SEARCH_DIRECTIVE,
	]
		.filter(Boolean)
		.join("\n\n");
}
