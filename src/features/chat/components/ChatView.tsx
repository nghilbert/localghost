import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	BookmarkIcon,
	ChevronDownIcon,
	DatabaseIcon,
	DownloadIcon,
	SlidersHorizontalIcon,
	Volume2Icon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ChatFeed } from "#/components/ui/custom/ChatFeed";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import { ModelPicker } from "#/features/chat/components/ModelPicker";
import { updateSession } from "#/features/chat/lib/chat.functions";
import { createPreset, presetsQueryOptions } from "#/features/chat/lib/preset.functions";
import { MemoryModal } from "#/features/memory/components/MemoryModal";
import { cn } from "#/lib/utils";

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
	systemPrompt?: string | null;
	temperature?: number | null;
	ragEnabled?: boolean;
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
	const [showPresets, setShowPresets] = useState(false);
	const [systemPrompt, setSystemPrompt] = useState(session.systemPrompt ?? "");
	const [temperature, setTemperature] = useState(session.temperature ?? 0.7);
	const [ragEnabled, setRagEnabled] = useState(session.ragEnabled ?? false);
	const [autoSpeak, setAutoSpeak] = useState(
		() => typeof localStorage !== "undefined" && localStorage.getItem("ody-auto-speak") === "1",
	);

	const { data: presets = [] } = useQuery(presetsQueryOptions());

	const savePresetMut = useMutation({
		mutationFn: (name: string) =>
			createPreset({ data: { name, systemPrompt, temperature, model: session.model } }),
	});

	const presetMut = useMutation({
		mutationFn: (patch: {
			systemPrompt?: string | null;
			temperature?: number;
			ragEnabled?: boolean;
		}) => updateSession({ data: { id: session.id, data: patch } }),
	});

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
							queryClient.invalidateQueries({ queryKey: ["session", session.id] });
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

	function exportAs(format: "md" | "json") {
		const filename = `${session.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${format === "md" ? "md" : "json"}`;
		let content: string;
		if (format === "md") {
			content = `# ${session.name}\n\n`;
			for (const m of messages) {
				const role = m.role === "user" ? "**You**" : "**Assistant**";
				content += `${role}\n\n${m.content}\n\n---\n\n`;
			}
		} else {
			content = JSON.stringify(
				{ session: { id: session.id, name: session.name, model: session.model }, messages },
				null,
				2,
			);
		}
		const blob = new Blob([content], {
			type: format === "md" ? "text/markdown" : "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
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
			<header className="shrink-0 border-b bg-background/80 backdrop-blur-sm">
				<div className="flex items-center justify-between px-4 py-2">
					<h1 className="truncate text-sm font-medium text-foreground">{session.name}</h1>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => {
								const next = !ragEnabled;
								setRagEnabled(next);
								presetMut.mutate({ ragEnabled: next });
							}}
							className={cn(
								"flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-muted",
								ragEnabled ? "bg-primary/10 text-primary" : "text-muted-foreground",
							)}
							title={ragEnabled ? "RAG enabled — click to disable" : "Enable document RAG"}
						>
							<DatabaseIcon size={13} />
						</button>
						<button
							type="button"
							onClick={() => {
								const next = !autoSpeak;
								setAutoSpeak(next);
								localStorage.setItem("ody-auto-speak", next ? "1" : "0");
							}}
							className={cn(
								"flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-muted",
								autoSpeak ? "bg-primary/10 text-primary" : "text-muted-foreground",
							)}
							title={autoSpeak ? "Auto-speak enabled — click to disable" : "Enable auto-speak"}
						>
							<Volume2Icon size={13} />
						</button>
						<button
							type="button"
							onClick={() => setShowPresets((p) => !p)}
							className={cn(
								"flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted",
								showPresets && "bg-muted text-foreground",
							)}
							title="Session settings"
						>
							<SlidersHorizontalIcon size={13} />
							<ChevronDownIcon
								size={11}
								className={cn("transition-transform", showPresets && "rotate-180")}
							/>
						</button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
									title="Export conversation"
								>
									<DownloadIcon size={13} />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-36">
								<DropdownMenuItem onClick={() => exportAs("md")}>
									Export as Markdown
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => exportAs("json")}>Export as JSON</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<MemoryModal />
						<ModelPicker
							sessionId={session.id}
							currentModel={session.model}
							currentEndpointId={session.endpointId}
						/>
					</div>
				</div>
				{showPresets && (
					<div className="border-t bg-muted/30 px-4 py-3">
						{presets.length > 0 && (
							<div className="mb-3 flex items-center gap-2">
								<span className="text-xs text-muted-foreground">Load preset:</span>
								<div className="flex flex-wrap gap-1">
									{presets.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => {
												setSystemPrompt(p.systemPrompt);
												if (p.temperature !== null) setTemperature(p.temperature);
												presetMut.mutate({
													systemPrompt: p.systemPrompt,
													...(p.temperature !== null ? { temperature: p.temperature } : {}),
												});
											}}
											className="rounded border bg-background px-2 py-0.5 text-xs hover:bg-muted"
										>
											{p.name}
										</button>
									))}
								</div>
							</div>
						)}
						<div className="flex flex-col gap-3 md:flex-row md:gap-6">
							<div className="flex-1">
								<div className="mb-1 flex items-center justify-between">
									<label
										htmlFor="system-prompt"
										className="text-xs font-medium text-muted-foreground"
									>
										System prompt
									</label>
									{systemPrompt.trim() && (
										<button
											type="button"
											onClick={() => {
												const name = prompt("Preset name:");
												if (name?.trim()) savePresetMut.mutate(name.trim());
											}}
											className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
											title="Save as preset"
										>
											<BookmarkIcon size={11} />
											Save
										</button>
									)}
								</div>
								<textarea
									id="system-prompt"
									value={systemPrompt}
									onChange={(e) => setSystemPrompt(e.target.value)}
									onBlur={() => presetMut.mutate({ systemPrompt: systemPrompt || null })}
									placeholder="You are a helpful assistant…"
									rows={2}
									className="w-full resize-none rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
								/>
							</div>
							<div className="w-full md:w-40">
								<label
									htmlFor="temperature"
									className="mb-1 block text-xs font-medium text-muted-foreground"
								>
									Temperature: {temperature.toFixed(1)}
								</label>
								<input
									id="temperature"
									type="range"
									min={0}
									max={2}
									step={0.1}
									value={temperature}
									onChange={(e) => setTemperature(Number(e.target.value))}
									onMouseUp={() => presetMut.mutate({ temperature })}
									onTouchEnd={() => presetMut.mutate({ temperature })}
									className="w-full accent-primary"
								/>
								<div className="flex justify-between text-[10px] text-muted-foreground">
									<span>Precise</span>
									<span>Creative</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</header>

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
				{allDisplayMessages.map((msg, idx) => (
					<ChatMessage
						key={msg.id}
						senderRole={msg.role}
						content={msg.content}
						isStreaming={msg.id === "streaming"}
						toolCalls={msg.toolCalls}
						autoSpeak={
							autoSpeak &&
							msg.role === "assistant" &&
							msg.id !== "streaming" &&
							idx === allDisplayMessages.length - 1
						}
					/>
				))}
				<div ref={bottomRef} />
			</ChatFeed>

			<div className="border-t px-4 py-3">
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
