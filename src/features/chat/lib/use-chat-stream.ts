import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

type ToolCallRecord = { id: string; tool: string; result: string };

type Message = {
	id: string;
	role: string;
	content: string;
	toolCalls?: ToolCallRecord[];
};

type UseChatStreamOptions = {
	sessionId: string;
	initialMessages: Message[];
};

export function useChatStream({ sessionId, initialMessages }: UseChatStreamOptions) {
	const queryClient = useQueryClient();
	const bottomRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [streamingContent, setStreamingContent] = useState<string | null>(null);
	const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallRecord[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
	}, []);

	async function handleSubmit(message: string) {
		if (isStreaming) return;

		setIsStreaming(true);
		setStreamingContent("");
		setStreamingToolCalls([]);

		const tempUserMsg: Message = { id: `temp-${Date.now()}`, role: "user", content: message };
		setMessages((prev) => [...prev, tempUserMsg]);
		scrollToBottom();

		const abort = new AbortController();
		abortRef.current = abort;

		try {
			const response = await fetch("/api/chat/stream", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId, message }),
				signal: abort.signal,
			});

			if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let fullText = "";
			const toolCalls: ToolCallRecord[] = [];

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
							delta?: string;
							error?: string;
							tool?: string;
							result?: string;
							name?: string;
						};

						if (evt.type === "delta" && evt.delta) {
							fullText += evt.delta;
							setStreamingContent(fullText);
							scrollToBottom();
						} else if (evt.type === "tool_result" && evt.tool) {
							const tc: ToolCallRecord = {
								id: `tc-${Date.now()}-${toolCalls.length}`,
								tool: evt.tool,
								result: evt.result ?? "",
							};
							toolCalls.push(tc);
							setStreamingToolCalls([...toolCalls]);
							scrollToBottom();
						} else if (evt.type === "done") {
							const assistantMsg: Message = {
								id: `temp-ai-${Date.now()}`,
								role: "assistant",
								content: fullText,
								toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
							};
							setMessages((prev) => [...prev, assistantMsg]);
							setStreamingContent(null);
							setStreamingToolCalls([]);
							scrollToBottom();
						} else if (evt.type === "session_name" && evt.name) {
							queryClient.invalidateQueries({ queryKey: ["sessions"] });
							queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
						} else if (evt.type === "error") {
							console.error("LLM error:", evt.error);
						}
					} catch {
						// skip malformed SSE chunk
					}
				}
			}
		} catch (err) {
			if ((err as Error).name !== "AbortError") console.error("Stream error:", err);
			setStreamingContent(null);
			setStreamingToolCalls([]);
		} finally {
			setIsStreaming(false);
			abortRef.current = null;
			queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
		}
	}

	function handleStop() {
		abortRef.current?.abort();
	}

	const allDisplayMessages: Message[] =
		streamingContent !== null
			? [
					...messages,
					{
						id: "streaming",
						role: "assistant",
						content: streamingContent,
						toolCalls: streamingToolCalls.length > 0 ? streamingToolCalls : undefined,
					},
				]
			: messages;

	return {
		messages,
		allDisplayMessages,
		isStreaming,
		bottomRef,
		handleSubmit,
		handleStop,
	};
}
