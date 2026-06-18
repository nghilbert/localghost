import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ArrowUpIcon,
	BotIcon,
	ChevronDownIcon,
	MessageSquareIcon,
	SquareIcon,
	Volume2Icon,
} from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { Card, CardAction, CardContent, CardFooter } from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { Slider } from "#/components/ui/slider";
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { ConversationMessages } from "#/features/chat/components/ChatView/ConversationMessages";
import { ExportMenu } from "#/features/chat/components/ChatView/ExportMenu";
import { useChatStream } from "#/features/chat/hooks/use-chat-stream";
import {
	type getConversation,
	updateConversation,
} from "#/features/chat/lib/conversation.functions";
import { ModelPicker } from "#/features/endpoints/components/ModelPicker";
import { MemoryDialog } from "#/features/memory/components/MemoryDialog";
import { useLocalStorage } from "#/hooks/use-local-storage";
import { cn } from "#/lib/utils";

type Conversation = Awaited<ReturnType<typeof getConversation>>;

type ChatViewProps = {
	conversation: Conversation;
};

export function ChatView({ conversation }: ChatViewProps) {
	const queryClient = useQueryClient();
	const { messages, isStreaming, bottomRef, handleSubmit, handleStop } = useChatStream({
		conversationId: conversation.id,
	});

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] });
		queryClient.invalidateQueries({ queryKey: ["conversations"] });
	};

	const patch = useMutation({
		mutationFn: (data: Parameters<typeof updateConversation>[0]["data"]["data"]) =>
			updateConversation({ data: { id: conversation.id, data } }),
		onSuccess: invalidate,
	});

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [mode, setMode] = useState<"chat" | "agent">(
		conversation.mode === "agent" ? "agent" : "chat",
	);
	const [showSettings, setShowSettings] = useState(false);
	const [autoSpeak, setAutoSpeak] = useLocalStorage("ody-auto-speak", false);
	const [systemPrompt, setSystemPrompt] = useState(conversation.systemPrompt ?? "");
	const [temperature, setTemperature] = useState(conversation.temperature ?? 0.7);

	const isReady = Boolean(conversation.model && conversation.endpointId);

	function submit() {
		const value = textareaRef.current?.value.trim();
		if (!value || isStreaming || !isReady) return;
		handleSubmit(value);
		if (textareaRef.current) textareaRef.current.value = "";
	}

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}

	return (
		<div className="flex h-full flex-col">
			<PageHeader
				title={conversation.title}
				actions={
					<>
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
									onClick={() => setShowSettings((s) => !s)}
									className={cn(
										"h-7 gap-1 px-2 text-xs text-muted-foreground",
										showSettings && "bg-muted text-foreground",
									)}
									aria-label="Conversation settings"
								>
									<ChevronDownIcon
										size={13}
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
					</>
				}
			/>

			{showSettings && (
				<div className="border-t bg-muted/30 px-4 py-3">
					<div className="flex flex-col gap-3 md:flex-row md:gap-6">
						<Field className="flex-1 gap-1">
							<FieldLabel htmlFor="system-prompt" className="text-xs text-muted-foreground">
								System prompt
							</FieldLabel>
							<Textarea
								id="system-prompt"
								value={systemPrompt}
								onChange={(e) => setSystemPrompt(e.target.value)}
								onBlur={() => patch.mutate({ systemPrompt: systemPrompt || null })}
								placeholder="You are a helpful assistant…"
								rows={2}
								className="resize-none text-xs"
							/>
						</Field>
						<Field className="w-full gap-1 md:w-40">
							<FieldLabel htmlFor="temperature" className="text-xs text-muted-foreground">
								Temperature: {temperature.toFixed(1)}
							</FieldLabel>
							<Slider
								id="temperature"
								min={0}
								max={2}
								step={0.1}
								value={[temperature]}
								onValueChange={([value]) => setTemperature(value ?? temperature)}
								onValueCommit={([value]) => patch.mutate({ temperature: value ?? temperature })}
								className="w-full"
							/>
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Precise</span>
								<span>Creative</span>
							</div>
						</Field>
					</div>
				</div>
			)}

			<ConversationMessages
				messages={messages}
				isStreaming={isStreaming}
				autoSpeak={autoSpeak}
				isReady={isReady}
				bottomRef={bottomRef}
			/>

			<div className="px-4 py-3">
				<Card>
					<CardContent>
						<Textarea
							ref={textareaRef}
							rows={1}
							placeholder="Message…"
							className="max-h-50 field-sizing-content resize-none"
							onKeyDown={handleKeyDown}
							disabled={!isReady}
						/>
					</CardContent>
					<CardFooter className="justify-between gap-2">
						<CardAction className="flex items-center gap-2">
							<ToggleGroup
								type="single"
								variant="outline"
								size="sm"
								value={mode}
								onValueChange={(value) => {
									if (value === "chat" || value === "agent") {
										setMode(value);
										patch.mutate({ mode: value });
									}
								}}
							>
								<ToggleGroupItem value="chat">
									<MessageSquareIcon size={12} />
									Chat
								</ToggleGroupItem>
								<ToggleGroupItem value="agent">
									<BotIcon size={12} />
									Agent
								</ToggleGroupItem>
							</ToggleGroup>
							<ModelPicker
								currentModel={conversation.model}
								currentEndpointId={conversation.endpointId}
								onSelect={(endpointId, model) => patch.mutate({ endpointId, model })}
							/>
						</CardAction>
						<CardAction>
							{isStreaming ? (
								<Button
									size="icon"
									variant="outline"
									className="h-8 w-8 shrink-0 rounded-full"
									onClick={handleStop}
								>
									<SquareIcon size={14} />
									<span className="sr-only">Stop</span>
								</Button>
							) : (
								<Button
									size="icon"
									className="h-8 w-8 shrink-0 rounded-full"
									onClick={submit}
									disabled={!isReady}
								>
									<ArrowUpIcon size={14} />
									<span className="sr-only">Send</span>
								</Button>
							)}
						</CardAction>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
