import { Link } from "@tanstack/react-router";
import { BookOpenIcon, ChevronDownIcon, SlidersHorizontalIcon, Volume2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { ChatFeed } from "#/features/chat/components/ChatFeed";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import { ChatHeaderToggle } from "#/features/chat/components/ChatView/ChatHeaderToggle";
import { ExportMenu } from "#/features/chat/components/ChatView/ExportMenu";
import { SessionSettingsPanel } from "#/features/chat/components/ChatView/SessionSettingsPanel";
import { ModelPicker } from "#/features/chat/components/ModelPicker";
import { useChatStream } from "#/features/chat/hooks/use-chat-stream";
import { useSession } from "#/features/chat/hooks/use-session";
import { MemoryDialog } from "#/features/memory/components/MemoryDialog";
import { useLocalStorage } from "#/hooks/use-local-storage";
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
	const [showSettings, setShowSettings] = useState(false);
	const [autoSpeak, setAutoSpeak] = useLocalStorage("ody-auto-speak", false);

	const isReady = Boolean(session.model && session.endpointId);

	const { updateSession } = useSession(session.id);

	function handleModeChange(newMode: "chat" | "agent") {
		setMode(newMode);
		updateSession.mutate({ mode: newMode });
	}

	function handleAutoSpeakToggle() {
		setAutoSpeak((prev) => !prev);
	}

	return (
		<div className="flex h-full flex-col">
			<header className="shrink-0 border-b bg-background/80 backdrop-blur-sm">
				<div className="flex items-center justify-between px-4 py-2">
					<h1 className="truncate text-sm font-medium text-foreground">{session.name}</h1>
					<div className="flex items-center gap-1.5">
						<ChatHeaderToggle
							icon={<Volume2Icon size={13} />}
							isActive={autoSpeak}
							activeLabel="Auto-speak enabled — click to disable"
							inactiveLabel="Enable auto-speak"
							onToggle={handleAutoSpeakToggle}
						/>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									onClick={() => setShowSettings((isShown) => !isShown)}
									className={cn(
										"h-7 gap-1 px-2 text-xs text-muted-foreground",
										showSettings && "bg-muted text-foreground",
									)}
									aria-label="Session settings"
								>
									<SlidersHorizontalIcon size={13} />
									<ChevronDownIcon
										size={11}
										className={cn("transition-transform", showSettings && "rotate-180")}
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Session settings</TooltipContent>
						</Tooltip>
						<ExportMenu
							session={{ id: session.id, name: session.name, model: session.model }}
							messages={allDisplayMessages}
						/>
						<MemoryDialog />
					</div>
				</div>
				{showSettings && (
					<SessionSettingsPanel
						sessionModel={session.model}
						initialSystemPrompt={session.systemPrompt ?? ""}
						initialTemperature={session.temperature ?? 0.7}
						onPatchSession={(patch) => updateSession.mutate(patch)}
					/>
				)}
			</header>

			<ChatFeed className="flex-1 px-4">
				{allDisplayMessages.length === 0 &&
					(isReady ? (
						<Empty className="h-full">
							<EmptyHeader>
								<EmptyDescription>Send a message to start chatting.</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<Empty className="h-full">
							<EmptyHeader>
								<EmptyTitle>No model connected yet</EmptyTitle>
								<EmptyDescription>
									Install a local model in the Cookbook, then pick it from the model menu below the
									message box.
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button asChild>
									<Link to="/cookbook">
										<BookOpenIcon />
										Browse the Cookbook
									</Link>
								</Button>
							</EmptyContent>
						</Empty>
					))}
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

			<div className="px-4 py-3">
				<ChatInput
					onSubmit={handleSubmit}
					isStreaming={isStreaming}
					onStop={handleStop}
					disabled={!isReady}
					mode={mode}
					onModeChange={handleModeChange}
					modelSelect={
						<ModelPicker
							sessionId={session.id}
							currentModel={session.model}
							currentEndpointId={session.endpointId}
						/>
					}
				/>
			</div>
		</div>
	);
}
