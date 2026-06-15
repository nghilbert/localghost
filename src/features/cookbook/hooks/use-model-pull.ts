import { EventType } from "@tanstack/ai/client";
import { fetchServerSentEvents } from "@tanstack/ai-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { PullProgress } from "#/features/cookbook/lib/types";

const connection = fetchServerSentEvents("/api/cookbook/pull");

export function useModelPull() {
	const queryClient = useQueryClient();
	const [pulling, setPulling] = useState<Record<string, PullProgress>>({});

	async function pull(model: string, ollamaUrl: string) {
		setPulling((prev) => ({ ...prev, [model]: { status: "Starting…" } }));

		try {
			for await (const chunk of connection.connect([], { model, ollamaUrl })) {
				if (chunk.type === EventType.CUSTOM && chunk.name === "progress") {
					const value: Partial<PullProgress> = chunk.value;
					setPulling((prev) => ({
						...prev,
						[model]: {
							status: value.status ?? "Downloading…",
							completed: value.completed,
							total: value.total,
						},
					}));
				} else if (chunk.type === EventType.RUN_FINISHED) {
					setPulling((prev) => {
						const next = { ...prev };
						delete next[model];
						return next;
					});
					await queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
					toast.success(`${model} is ready`);
				} else if (chunk.type === EventType.RUN_ERROR) {
					throw new Error(chunk.message);
				}
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Pull failed";
			setPulling((prev) => ({ ...prev, [model]: { status: "Error", error: msg } }));
			toast.error(`Failed to pull ${model}`, { description: msg });
		}
	}

	function cancelPull(model: string) {
		setPulling((prev) => {
			const next = { ...prev };
			delete next[model];
			return next;
		});
	}

	return { pulling, pull, cancelPull };
}
