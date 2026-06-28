import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardAction, CardContent, CardFooter } from "#/components/ui/card";
import { Textarea } from "#/components/ui/textarea";
import { ModelPicker } from "#/features/chat/components/ChatInput/ModelPicker";
import { type ToolControls, ToolToggles } from "#/features/chat/components/ChatInput/ToolToggles";

type ChatInputProps = {
	/** The conversation being composed in; the model picker shows only here, not on `/new`. */
	conversationId?: string;
	/** Blocks sending while the conversation has no model chosen. */
	disabled?: boolean;
	isStreaming: boolean;
	/** Tool toggles, shown only inside a conversation; omitted on the `/new` composer. */
	tools?: ToolControls;
	sendMessage: (content: string) => void;
	stop: () => void;
};

export function ChatInput({
	conversationId,
	disabled = false,
	isStreaming,
	tools,
	sendMessage,
	stop,
}: ChatInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	function submit() {
		const value = textareaRef.current?.value.trim();
		if (!value || isStreaming || disabled) return;
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
					disabled={disabled}
				/>
			</CardContent>

			<CardFooter className="justify-between gap-2">
				<CardAction className="flex items-center gap-2">
					<ModelPicker conversationId={conversationId} />
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
							disabled={disabled}
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
