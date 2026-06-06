import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { ChatFeed } from "#/components/ui/custom/ChatFeed";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import { ModelPicker } from "#/features/chat/components/ModelPicker";
import { updateSession } from "#/features/chat/lib/chat.functions";
import { MemoryModal } from "#/features/memory/components/MemoryModal";

type ToolCallRecord = { id: string; tool: string; result: string };

type Message = {
	id: string;
	role: string;
	content: string;
	toolCalls?: ToolCallRecord[];
};

type Session = {
	id: string;
	name: string;
	model: string;
	mode: string;
	endpointId?: string | null;
	endpoint?: { id: string; name: string; url: string; provider: string } | null;
	messages: Message[];
};

type Props = {
	session: Session;
};

export function ChatView({ session }: Props) {
	const queryClient = useQueryClient();
	const bottomRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	const [messages, setMessages] = useState<Message[]>(session.messages);
	const [streamingContent, setStreamingContent] = useState<string | null>(null);
	const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallRecord[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [mode, setMode] = useState<"chat" | "agent">(session.mode === "agent" ? "agent" : "chat");

	const modeMut = useMutation({
		mutationFn: (newMode: "chat" | "agent") =>
			updateSession({ data: { id: session.id, data: { mode: newMode } } }),
	});

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
	}, []);

	function handleModeChange(newMode: "chat" | "agent") {
		setMode(newMode);
		modeMut.mutate(newMode);
	}

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
				body: JSON.stringify({ sessionId: session.id, message }),
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
			queryClient.invalidateQueries({ queryKey: ["session", session.id] });
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

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b px-4 py-2">
				<h1 className="truncate text-sm font-medium">{session.name}</h1>
				<div className="flex items-center gap-2">
					<MemoryModal />
					<ModelPicker
						sessionId={session.id}
						currentModel={session.model}
						currentEndpointId={session.endpointId}
					/>
				</div>
			</div>

			<ChatFeed className="flex-1 px-4">
				{allDisplayMessages.length === 0 && (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">
							{session.model
								? "Send a message to start chatting."
								: "Select a model above to get started."}
						</p>
					</div>
				)}
				{allDisplayMessages.map((msg) => (
					<ChatMessage
						key={msg.id}
						senderRole={msg.role}
						content={msg.content}
						isStreaming={msg.id === "streaming"}
						toolCalls={msg.toolCalls}
					/>
				))}
				<div ref={bottomRef} />
			</ChatFeed>

			<div className="border-t p-4">
				<ChatInput
					onSubmit={handleSubmit}
					isStreaming={isStreaming}
					onStop={handleStop}
					disabled={!session.model || !session.endpointId}
					mode={mode}
					onModeChange={handleModeChange}
				/>
				{(!session.model || !session.endpointId) && (
					<p className="mt-1 text-center text-xs text-muted-foreground">
						{!session.endpointId ? (
							<>
								No provider configured —{" "}
								<Link to="/settings" className="underline underline-offset-2">
									add one in Settings
								</Link>
							</>
						) : (
							"Select a model using the picker above"
						)}
					</p>
				)}
			</div>
		</div>
	);
}
