import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardAction, CardContent, CardFooter } from "#/components/ui/card";
import { Textarea } from "#/components/ui/textarea";
import { type ToolControls, ToolToggles } from "#/features/chat/components/ChatView/ToolToggles";
import { ModelPicker } from "#/features/endpoints/components/ModelPicker";

type ChatInputProps = {
	model: string;
	endpointId: string | null | undefined;
	isReady: boolean;
	onModelSelect: (endpointId: string, model: string) => void;
	isStreaming: boolean;
	/** Tool toggles, shown only inside a conversation; omitted on the `/new` composer. */
	tools?: ToolControls;
	sendMessage: (content: string) => Promise<void>;
	stop: () => void;
};

export function ChatInput({
	model,
	endpointId,
	isReady,
	onModelSelect,
	isStreaming,
	tools,
	sendMessage,
	stop,
}: ChatInputProps) {
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
					<ModelPicker
						currentModel={model}
						currentEndpointId={endpointId}
						onSelect={onModelSelect}
						needsAttention={!isReady}
					/>
					{tools && <ToolToggles {...tools} />}
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
