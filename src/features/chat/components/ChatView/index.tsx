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
import { ScrollArea } from "#/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import { ConversationSettingsPanel } from "#/features/chat/components/ChatView/ConversationSettingsPanel";
import { ExportMenu } from "#/features/chat/components/ChatView/ExportMenu";
import { useChatStream } from "#/features/chat/hooks/use-chat-stream";
import { useConversation } from "#/features/chat/hooks/use-conversation";
import { ModelPicker } from "#/features/endpoints/components/ModelPicker";
import { MemoryDialog } from "#/features/memory/components/MemoryDialog";
import { useLocalStorage } from "#/hooks/use-local-storage";
import { cn } from "#/lib/utils";

type Conversation = {
	id: string;
	title: string;
	model: string;
	mode: string;
	systemPrompt?: string | null;
	temperature?: number | null;
	endpointId?: string | null;
	endpoint?: { id: string; name: string; url: string; provider: string } | null;
};

type ChatViewProps = {
	conversation: Conversation;
};

export function ChatView({ conversation }: ChatViewProps) {
	const { messages, isStreaming, bottomRef, handleSubmit, handleStop } = useChatStream({
		conversationId: conversation.id,
	});

	const [mode, setMode] = useState<"chat" | "agent">(
		conversation.mode === "agent" ? "agent" : "chat",
	);
	const [showSettings, setShowSettings] = useState(false);
	const [autoSpeak, setAutoSpeak] = useLocalStorage("ody-auto-speak", false);

	const isReady = Boolean(conversation.model && conversation.endpointId);

	const { updateConversation } = useConversation(conversation.id);

	function handleModeChange(newMode: "chat" | "agent") {
		setMode(newMode);
		updateConversation.mutate({ mode: newMode });
	}

	return (
		<div className="flex h-full flex-col">
			<header className="shrink-0 border-b bg-background/80 backdrop-blur-sm">
				<div className="flex items-center justify-between px-4 py-2">
					<h1 className="truncate text-sm font-medium text-foreground">{conversation.title}</h1>
					<div className="flex items-center gap-1.5">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									onClick={() => setAutoSpeak((prev) => !prev)}
									className={cn(
										"h-7 gap-1 px-2 text-xs",
										autoSpeak ? "bg-primary/10 text-primary" : "text-muted-foreground",
									)}
									aria-label={
										autoSpeak ? "Auto-speak enabled — click to disable" : "Enable auto-speak"
									}
								>
									<Volume2Icon size={13} />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{autoSpeak ? "Auto-speak enabled — click to disable" : "Enable auto-speak"}
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									onClick={() => setShowSettings((isShown) => !isShown)}
									className={cn(
										"h-7 gap-1 px-2 text-xs text-muted-foreground",
										showSettings && "bg-muted text-foreground",
									)}
									aria-label="Conversation settings"
								>
									<SlidersHorizontalIcon size={13} />
									<ChevronDownIcon
										size={11}
										className={cn("transition-transform", showSettings && "rotate-180")}
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Conversation settings</TooltipContent>
						</Tooltip>
						<ExportMenu
							conversation={{
								id: conversation.id,
								title: conversation.title,
								model: conversation.model,
							}}
							messages={messages}
						/>
						<MemoryDialog />
					</div>
				</div>
				{showSettings && (
					<ConversationSettingsPanel
						initialSystemPrompt={conversation.systemPrompt ?? ""}
						initialTemperature={conversation.temperature ?? 0.7}
						onPatch={(patch) => updateConversation.mutate(patch)}
					/>
				)}
			</header>

			<section
				aria-label="Conversation"
				aria-live="polite"
				aria-relevant="additions"
				className="flex-1 overflow-hidden"
			>
				<ScrollArea className="h-full">
					<div className="flex min-h-full flex-col px-4">
						{messages.length === 0 &&
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
											Install a local model in the Cookbook, then pick it from the model menu below
											the message box.
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
						{messages.map((msg, idx) => {
							const isLast = idx === messages.length - 1;
							const isStreamingMessage = isStreaming && isLast && msg.role === "assistant";
							return (
								<ChatMessage
									key={msg.id}
									message={msg}
									isStreaming={isStreamingMessage}
									autoSpeak={autoSpeak && msg.role === "assistant" && !isStreamingMessage && isLast}
								/>
							);
						})}
						<div ref={bottomRef} />
					</div>
				</ScrollArea>
			</section>

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
							currentModel={conversation.model}
							currentEndpointId={conversation.endpointId}
							onSelect={(endpointId, model) => updateConversation.mutate({ endpointId, model })}
						/>
					}
				/>
			</div>
		</div>
	);
}
