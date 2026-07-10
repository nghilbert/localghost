import { getOllamaUrl } from "#/features/pull-model/lib/ollama/discovery.server";
import { ollamaClient } from "#/shared/lib/ollama/client.server";

/** Removes an installed model from the user's Ollama instance. */
export async function removeInstalledModel({
	userId,
	model,
}: {
	userId: string;
	model: string;
}): Promise<void> {
	const ollamaUrl = await getOllamaUrl(userId);
	await ollamaClient({ host: ollamaUrl }).delete({ model });
}
