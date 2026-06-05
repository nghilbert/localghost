import { type LLMMessage, streamLLM } from "#/lib/llm.server";
import { webSearch } from "#/lib/tools/web_search";

export type ResearchChunk =
	| { type: "progress"; message: string }
	| { type: "report"; content: string }
	| { type: "done" }
	| { type: "error"; error: string };

const MAX_ROUNDS = 5;

const PLAN_PROMPT = `You are a research strategist. Analyze this question and create a research plan.

Question: {question}

Return ONLY a JSON object with:
- "sub_questions": array of 3-5 focused sub-questions to investigate
- "key_topics": array of 3-5 key topics to cover

Example: {"sub_questions": ["What is X?", "How does Y work?"], "key_topics": ["topic1", "topic2"]}`;

const QUERY_GEN_PROMPT = `You are a search query generator.

Original question: {question}
Current report: {report}
Round: {round}/{max_rounds}

Generate {count} focused search queries that will find new information not already in the report.
Return ONLY a JSON array of query strings.
Example: ["query one", "query two"]`;

const SYNTHESIZE_PROMPT = `You are a research synthesizer updating an evolving report.

Original question: {question}

Current report:
{report}

New findings:
{findings}

Integrate the new findings into the report. Write a well-organized, comprehensive answer.
Keep inline citations like [source](url). Remove redundancy. Write only the updated report.`;

const STOP_PROMPT = `Is this research report comprehensive enough to fully answer the question?

Question: {question}
Report length: {length} characters
Rounds completed: {round}/{max_rounds}

Reply with ONLY "YES" or "NO" followed by one sentence explaining why.`;

const FINAL_PROMPT = `Write a comprehensive, well-structured research report answering this question:

**Question:** {question}

Evidence gathered:
{report}

Requirements:
- Use ## and ### headings for clear structure
- Include specific facts, data, and inline citations [text](url)
- Write a brief executive summary at the top
- End with a conclusion directly answering the question
- Be thorough and informative`;

/**
 * Iterative research loop: Plan → Search → Synthesize → Evaluate → Repeat.
 * Yields progress events while running, then streams the final report as delta chunks.
 */
export async function* runResearch(opts: {
	url: string;
	apiKey?: string;
	model: string;
	question: string;
}): AsyncGenerator<ResearchChunk> {
	const { url, apiKey, model, question } = opts;
	let report = "";

	yield { type: "progress", message: "Planning research strategy…" };

	// Step 1: Generate research plan
	const plan = await callLLM(url, apiKey, model, [
		{ role: "user", content: PLAN_PROMPT.replace("{question}", question) },
	]);

	let subQuestions: string[] = [question];
	try {
		const parsed = JSON.parse(extractJson(plan)) as { sub_questions?: string[] };
		if (parsed.sub_questions?.length) subQuestions = parsed.sub_questions;
	} catch {
		// Fall back to original question
	}

	yield {
		type: "progress",
		message: `Research plan ready — ${subQuestions.length} sub-questions identified`,
	};

	// Step 2: Iterative search + synthesize rounds
	for (let round = 1; round <= MAX_ROUNDS; round++) {
		yield { type: "progress", message: `Round ${round}/${MAX_ROUNDS}: generating search queries…` };

		// Generate search queries
		const queryResp = await callLLM(url, apiKey, model, [
			{
				role: "user",
				content: QUERY_GEN_PROMPT.replace("{question}", question)
					.replace("{report}", report.slice(0, 2000) || "(none yet)")
					.replace("{round}", String(round))
					.replace("{max_rounds}", String(MAX_ROUNDS))
					.replace("{count}", round === 1 ? "4" : "3"),
			},
		]);

		let queries: string[] = [];
		try {
			queries = JSON.parse(extractJson(queryResp)) as string[];
		} catch {
			queries = round === 1 ? subQuestions.slice(0, 3) : [question];
		}

		yield {
			type: "progress",
			message: `Searching: ${queries.slice(0, 2).join(", ")}${queries.length > 2 ? "…" : ""}`,
		};

		// Run searches in parallel
		const searchResults = await Promise.allSettled(queries.map((q) => webSearch(q, 4)));
		const findings = searchResults
			.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
			.map((r) => r.value)
			.filter((s) => s && s !== "No results found.")
			.join("\n\n---\n\n");

		if (!findings) {
			yield { type: "progress", message: `Round ${round}: no new search results found` };
			continue;
		}

		yield {
			type: "progress",
			message: `Round ${round}: synthesizing ${findings.length} characters of findings…`,
		};

		// Synthesize into growing report
		report = await callLLM(url, apiKey, model, [
			{
				role: "user",
				content: SYNTHESIZE_PROMPT.replace("{question}", question)
					.replace("{report}", report || "(empty — this is the first round)")
					.replace("{findings}", findings.slice(0, 12000)),
			},
		]);

		yield {
			type: "progress",
			message: `Round ${round} complete — report is ${report.length} characters`,
		};

		// Check if we have enough after round 2+
		if (round >= 2) {
			const stopResp = await callLLM(url, apiKey, model, [
				{
					role: "user",
					content: STOP_PROMPT.replace("{question}", question)
						.replace("{length}", String(report.length))
						.replace("{round}", String(round))
						.replace("{max_rounds}", String(MAX_ROUNDS)),
				},
			]);

			if (stopResp.trimStart().toUpperCase().startsWith("YES")) {
				yield { type: "progress", message: "Research complete — writing final report…" };
				break;
			}
		}
	}

	yield { type: "progress", message: "Writing final report…" };

	// Step 3: Stream final polished report
	const finalMessages: LLMMessage[] = [
		{
			role: "user",
			content: FINAL_PROMPT.replace("{question}", question).replace(
				"{report}",
				report.slice(0, 15000),
			),
		},
	];

	try {
		const stream = await streamLLM({ url, apiKey, model, messages: finalMessages });
		const reader = stream.getReader();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value.type === "delta") {
				yield { type: "report", content: value.delta };
			}
		}
	} catch (err) {
		yield { type: "error", error: err instanceof Error ? err.message : "Unknown error" };
		return;
	}

	yield { type: "done" };
}

async function callLLM(
	url: string,
	apiKey: string | undefined,
	model: string,
	messages: LLMMessage[],
): Promise<string> {
	const stream = await streamLLM({ url, apiKey, model, messages });
	const reader = stream.getReader();
	let text = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value.type === "delta") text += value.delta;
	}

	return text;
}

/** Extract JSON from LLM output that may have prose around it. */
function extractJson(text: string): string {
	const match = text.match(/[[{][\s\S]*[\]}]/);
	return match ? match[0] : text;
}
