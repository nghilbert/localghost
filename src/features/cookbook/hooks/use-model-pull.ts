import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { PullProgress } from "#/features/cookbook/lib/types";

export function useModelPull() {
	const queryClient = useQueryClient();
	const [pulling, setPulling] = useState<Record<string, PullProgress>>({});

	async function pull(model: string, ollamaUrl: string) {
		setPulling((prev) => ({ ...prev, [model]: { status: "Starting…" } }));

		try {
			const res = await fetch("/api/cookbook/pull", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ model, ollamaUrl }),
			});

			if (!res.ok || !res.body) {
				throw new Error(`HTTP ${res.status}`);
			}

			const reader = res.body.getReader();
			const dec = new TextDecoder();
			let buf = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buf += dec.decode(value, { stream: true });
				const lines = buf.split("\n");
				buf = lines.pop() ?? "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					const raw = line.slice(6).trim();
					if (!raw) continue;
					try {
						const chunk = JSON.parse(raw) as {
							type: string;
							status?: string;
							completed?: number;
							total?: number;
							error?: string;
						};

						if (chunk.type === "progress") {
							setPulling((prev) => ({
								...prev,
								[model]: {
									status: chunk.status ?? "Downloading…",
									completed: chunk.completed,
									total: chunk.total,
								},
							}));
						} else if (chunk.type === "done") {
							setPulling((prev) => {
								const next = { ...prev };
								delete next[model];
								return next;
							});
							await queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
							toast.success(`${model} is ready`);
						} else if (chunk.type === "error") {
							throw new Error(chunk.error ?? "Unknown error");
						}
					} catch (e) {
						if (e instanceof SyntaxError) continue;
						throw e;
					}
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
