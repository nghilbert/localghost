import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "#/components/ui/input-group";
import { Separator } from "#/components/ui/separator";
import { ModelPicker } from "#/features/chat/components/ChatInput/ModelPicker";
import { type ToolControls, ToolToggles } from "#/features/chat/components/ChatInput/ToolToggles";
import type { ModelSelection } from "#/features/endpoints/lib/types";

type ChatInputProps = {
	disabled?: boolean;
	isStreaming: boolean;
	selection: ModelSelection | null;
	onSelect: (selection: ModelSelection) => void;
	/** Tool toggles, shown only inside a conversation; omitted on the `/new` composer. */
	tools?: ToolControls;
	sendMessage: (content: string) => void;
	stop?: () => void;
};

export function ChatInput({
	disabled = false,
	isStreaming,
	selection,
	onSelect,
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
		<InputGroup>
			<InputGroupTextarea
				ref={textareaRef}
				placeholder="Message…"
				className="max-h-50 field-sizing-content resize-none"
				onKeyDown={handleKeyDown}
				disabled={disabled}
			/>
			<Separator />
			<InputGroupAddon align="block-end" className="p-2">
				<ModelPicker selection={selection} onSelect={onSelect} />
				{tools && <ToolToggles {...tools} />}
				{isStreaming && stop ? (
					<InputGroupButton
						type="submit"
						variant="outline"
						size="icon-sm"
						className="ml-auto"
						onClick={stop}
					>
						<SquareIcon size={14} />
						<span className="sr-only">Stop</span>
					</InputGroupButton>
				) : (
					<InputGroupButton
						type="submit"
						variant="default"
						size="icon-sm"
						className="ml-auto"
						onClick={submit}
						disabled={disabled}
					>
						<ArrowUpIcon size={14} />
						<span className="sr-only">Send</span>
					</InputGroupButton>
				)}
			</InputGroupAddon>
		</InputGroup>
	);
}
