import { fetchServerSentEvents, type UIMessage } from "@tanstack/ai-client";
import { useChat } from "@tanstack/ai-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

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

// The endpoint is static, so the SSE connection adapter is created once and
// shared — `useChat` recreates its client whenever the connection identity
// changes, which would drop in-flight streaming state.
const connection = fetchServerSentEvents("/api/chat/stream");

/** Maps a persisted display message onto an `@tanstack/ai` UIMessage. */
function toUIMessage(message: Message): UIMessage {
	const role =
		message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user";
	return { id: message.id, role, parts: [{ type: "text", content: message.content }] };
}

/** Flattens a UIMessage's parts back to the `{ content, toolCalls }` display shape. */
function fromUIMessage(message: UIMessage): Message {
	let content = "";
	const toolCalls: ToolCallRecord[] = [];
	const toolNames = new Map<string, string>();

	for (const part of message.parts) {
		if (part.type === "text") {
			content += part.content;
		} else if (part.type === "tool-call") {
			toolNames.set(part.id, part.name);
		} else if (part.type === "tool-result") {
			toolCalls.push({
				id: part.toolCallId,
				tool: toolNames.get(part.toolCallId) ?? "tool",
				result: typeof part.content === "string" ? part.content : JSON.stringify(part.content),
			});
		}
	}

	return {
		id: message.id,
		role: message.role,
		content,
		toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
	};
}

export function useChatStream({ sessionId, initialMessages }: UseChatStreamOptions) {
	const queryClient = useQueryClient();
	const bottomRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
	}, []);

	const seedMessages = useMemo(() => initialMessages.map(toUIMessage), [initialMessages]);
	const forwardedProps = useMemo(() => ({ sessionId }), [sessionId]);

	const { messages, sendMessage, stop, status } = useChat({
		connection,
		initialMessages: seedMessages,
		forwardedProps,
		onFinish: () => {
			queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
		},
	});

	const isStreaming = status === "submitted" || status === "streaming";

	// Keep the feed pinned to the latest content as the transcript streams in.
	useEffect(() => {
		scrollToBottom();
	});

	const handleSubmit = useCallback(
		async (message: string) => {
			if (isStreaming) return;
			await sendMessage(message);
		},
		[isStreaming, sendMessage],
	);

	const handleStop = useCallback(() => stop(), [stop]);

	// While streaming, tag the trailing assistant message with the sentinel id so
	// the feed renders its typing state and skips auto-speak until it completes.
	const allDisplayMessages: Message[] = messages.map((message, index) => {
		const flat = fromUIMessage(message);
		if (isStreaming && index === messages.length - 1 && flat.role === "assistant") {
			return { ...flat, id: "streaming" };
		}
		return flat;
	});

	return {
		allDisplayMessages,
		isStreaming,
		bottomRef,
		handleSubmit,
		handleStop,
	};
}
