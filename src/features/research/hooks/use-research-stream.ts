import { useRef, useState } from "react";

type LogLine = { id: number; text: string };

export function useResearchStream() {
	const [isRunning, setIsRunning] = useState(false);
	const [log, setLog] = useState<LogLine[]>([]);
	const [report, setReport] = useState("");
	const abortRef = useRef<AbortController | null>(null);
	const logIdRef = useRef(0);

	function addLog(text: string) {
		setLog((prev) => [...prev, { id: ++logIdRef.current, text }]);
	}

	async function handleStart(question: string) {
		if (!question.trim() || isRunning) return;

		setIsRunning(true);
		setLog([]);
		setReport("");

		const abort = new AbortController();
		abortRef.current = abort;

		try {
			const response = await fetch("/api/research/stream", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ question }),
				signal: abort.signal,
			});

			if (!response.ok) {
				const msg = await response.text().catch(() => "");
				throw new Error(msg || `HTTP ${response.status}`);
			}
			if (!response.body) throw new Error("No response body");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					const raw = line.slice(6).trim();
					if (!raw) continue;
					try {
						const evt = JSON.parse(raw) as {
							type: string;
							message?: string;
							content?: string;
							error?: string;
						};
						if (evt.type === "progress" && evt.message) {
							addLog(evt.message);
						} else if (evt.type === "report" && evt.content) {
							setReport((prev) => prev + evt.content);
						} else if (evt.type === "error") {
							addLog(`Error: ${evt.error ?? "Unknown error"}`);
						}
					} catch {
						// skip malformed
					}
				}
			}
		} catch (err) {
			if ((err as Error).name !== "AbortError") {
				addLog(`Stream error: ${(err as Error).message}`);
			}
		} finally {
			setIsRunning(false);
			abortRef.current = null;
		}
	}

	function handleStop() {
		abortRef.current?.abort();
	}

	return { isRunning, log, report, handleStart, handleStop };
}
