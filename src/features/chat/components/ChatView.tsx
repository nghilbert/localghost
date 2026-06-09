import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	BookmarkIcon,
	ChevronDownIcon,
	DatabaseIcon,
	DownloadIcon,
	SlidersHorizontalIcon,
	Volume2Icon,
} from "lucide-react";
import { useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Textarea } from "#/components/ui/textarea";
import { ChatFeed } from "#/features/chat/components/ChatFeed";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import { ModelPicker } from "#/features/chat/components/ModelPicker";
import { updateSession } from "#/features/chat/lib/chat.functions";
import { createPreset, presetsQueryOptions } from "#/features/chat/lib/preset.functions";
import { useChatStream } from "#/features/chat/lib/use-chat-stream";
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

type ChatViewProps = {
	session: Session;
};

export function ChatView({ session }: ChatViewProps) {
	const { allDisplayMessages, isStreaming, bottomRef, handleSubmit, handleStop } = useChatStream({
		sessionId: session.id,
		initialMessages: session.messages,
	});

	const [mode, setMode] = useState<"chat" | "agent">(session.mode === "agent" ? "agent" : "chat");
	const [showPresets, setShowPresets] = useState(false);
	const [systemPrompt, setSystemPrompt] = useState(session.systemPrompt ?? "");
	const [temperature, setTemperature] = useState(session.temperature ?? 0.7);
	const [ragEnabled, setRagEnabled] = useState(session.ragEnabled ?? false);
	const [autoSpeak, setAutoSpeak] = useState(
		() => typeof localStorage !== "undefined" && localStorage.getItem("ody-auto-speak") === "1",
	);

	const { data: presets = [] } = useQuery(presetsQueryOptions());

	const savePresetMutation = useMutation({
		mutationFn: (name: string) =>
			createPreset({ data: { name, systemPrompt, temperature, model: session.model } }),
	});

	const sessionSettingsMutation = useMutation({
		mutationFn: (patch: {
			systemPrompt?: string | null;
			temperature?: number;
			ragEnabled?: boolean;
		}) => updateSession({ data: { id: session.id, data: patch } }),
	});

	const modeMutation = useMutation({
		mutationFn: (newMode: "chat" | "agent") =>
			updateSession({ data: { id: session.id, data: { mode: newMode } } }),
	});

	function handleModeChange(newMode: "chat" | "agent") {
		setMode(newMode);
		modeMutation.mutate(newMode);
	}

	function handleRagToggle() {
		const next = !ragEnabled;
		setRagEnabled(next);
		sessionSettingsMutation.mutate({ ragEnabled: next });
	}

	function handleAutoSpeakToggle() {
		const next = !autoSpeak;
		setAutoSpeak(next);
		localStorage.setItem("ody-auto-speak", next ? "1" : "0");
	}

	function exportAs(format: "md" | "json") {
		const filename = `${session.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${format === "md" ? "md" : "json"}`;
		let content: string;
		if (format === "md") {
			content = `# ${session.name}\n\n`;
			for (const m of allDisplayMessages) {
				const role = m.role === "user" ? "**You**" : "**Assistant**";
				content += `${role}\n\n${m.content}\n\n---\n\n`;
			}
		} else {
			content = JSON.stringify(
				{
					session: { id: session.id, name: session.name, model: session.model },
					messages: allDisplayMessages,
				},
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

	return (
		<div className="flex h-full flex-col">
			<header className="shrink-0 border-b bg-background/80 backdrop-blur-sm">
				<div className="flex items-center justify-between px-4 py-2">
					<h1 className="truncate text-sm font-medium text-foreground">{session.name}</h1>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={handleRagToggle}
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
							onClick={handleAutoSpeakToggle}
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
												sessionSettingsMutation.mutate({
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
												if (name?.trim()) savePresetMutation.mutate(name.trim());
											}}
											className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
											title="Save as preset"
										>
											<BookmarkIcon size={11} />
											Save
										</button>
									)}
								</div>
								<Textarea
									id="system-prompt"
									value={systemPrompt}
									onChange={(e) => setSystemPrompt(e.target.value)}
									onBlur={() =>
										sessionSettingsMutation.mutate({ systemPrompt: systemPrompt || null })
									}
									placeholder="You are a helpful assistant…"
									rows={2}
									className="resize-none text-xs"
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
									onMouseUp={() => sessionSettingsMutation.mutate({ temperature })}
									onTouchEnd={() => sessionSettingsMutation.mutate({ temperature })}
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
