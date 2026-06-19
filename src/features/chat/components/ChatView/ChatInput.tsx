import { ArrowUpIcon, BotIcon, MessageSquareIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardAction, CardContent, CardFooter } from "#/components/ui/card";
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { useConversationSettings } from "#/features/chat/hooks/use-conversation-settings";
import { ModelPicker } from "#/features/endpoints/components/ModelPicker";

/** Active mode segment fills with the themeable primary color so "which is on" reads clearly. */
const MODE_ITEM_CLASS =
	"data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary";

type Props = {
	conversationId: string;
	isStreaming: boolean;
	sendMessage: (content: string) => Promise<void>;
	stop: () => void;
};

export function ChatInput({ conversationId, isStreaming, sendMessage, stop }: Props) {
	const { mode, model, endpointId, isReady, setMode, setModel } =
		useConversationSettings(conversationId);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	function submit() {
		const value = textareaRef.current?.value.trim();
		if (!value || isStreaming || !isReady) return;
		sendMessage(value);
		if (textareaRef.current) textareaRef.current.value = "";
	}

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}

	return (
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
						spacing={0}
						value={mode}
						onValueChange={(value) => {
							if (value === "chat" || value === "agent") setMode(value);
						}}
					>
						<ToggleGroupItem
							value="chat"
							title="Plain chat — answers directly, no tools"
							className={MODE_ITEM_CLASS}
						>
							<MessageSquareIcon size={12} />
							Chat
						</ToggleGroupItem>
						<ToggleGroupItem
							value="agent"
							title="Agent — can use tools: web search, notes, memory, tasks"
							className={MODE_ITEM_CLASS}
						>
							<BotIcon size={12} />
							Agent
						</ToggleGroupItem>
					</ToggleGroup>
					<ModelPicker currentModel={model} currentEndpointId={endpointId} onSelect={setModel} />
				</CardAction>
				<CardAction>
					{isStreaming ? (
						<Button
							size="icon"
							variant="outline"
							className="h-8 w-8 shrink-0 rounded-full"
							onClick={stop}
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
	);
}
