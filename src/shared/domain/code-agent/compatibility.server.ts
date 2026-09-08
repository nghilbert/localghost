import { getProps } from "#/shared/lib/llamacpp/client.server";
import { stripTrailingV1 } from "#/shared/lib/llm/client.server";
import type { LLMProvider } from "#/shared/lib/llm/provider";

/**
 * Templates whose Jinja asserts the system message comes first. A coding harness injects
 * them mid-conversation, so the assertion fires on the second turn. The Qwen3.5 family
 * ships one, and it breaks the same way on LM Studio and Ollama.
 */
export function hasRigidMessageOrderTemplate(template: string): boolean {
	return /raise_exception\(\s*['"][^'"]*system message[^'"]*(?:beginning|first)/i.test(template);
}

/**
 * Why this model can't drive a code-agent session, or `null` if it can. Permissive by
 * construction: anything but a confirmed incompatibility answers `null`, since blocking a
 * model that would have worked is worse than letting a bad one fail on its first run.
 */
export async function codeAgentModelBlocker({
	endpoint,
	model,
}: {
	endpoint: { url: string; provider: LLMProvider; apiKey?: string };
	model: string;
}): Promise<string | null> {
	// Only llama.cpp serves `/props`. Every other provider goes unchecked.
	if (endpoint.provider !== "llamacpp") return null;

	const props = await getProps({
		url: stripTrailingV1(endpoint.url),
		model,
		...(endpoint.apiKey ? { apiKey: endpoint.apiKey } : {}),
	}).catch(() => null);
	if (!props) return null;

	if (props.chat_template && hasRigidMessageOrderTemplate(props.chat_template)) {
		return `${model}'s chat template requires the system message to come first, which a coding agent can't honour. Pick a different model.`;
	}
	const caps = props.chat_template_caps;
	if (caps && (!caps.supports_tools || !caps.supports_tool_calls)) {
		return `${model} can't call tools, so a coding agent has no way to read or edit files. Pick a different model.`;
	}
	return null;
}
