import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "#/components/ui/input-group";
import { Separator } from "#/components/ui/separator";
import { ModelPicker } from "#/features/chat/components/ChatInput/ModelPicker";
import { type ToolControls, ToolsMenu } from "#/features/chat/components/ChatInput/ToolsMenu";
import type { ModelSelection } from "#/features/endpoints/lib/types";

type ChatInputProps = {
	disabled?: boolean;
	isStreaming: boolean;
	selection: ModelSelection | null;
	/** Only the draft page selects a model; a locked conversation omits this. */
	onSelect?: (selection: ModelSelection) => void;
	/** Locks the model picker to a read-only label (a started conversation). */
	locked?: boolean;
	/** Per-message tool toggles (web search, memory). */
	tools?: ToolControls;
	sendMessage: (content: string) => void;
	stop?: () => void;
};

export function ChatInput({
	disabled = false,
	isStreaming,
	selection,
	onSelect,
	locked = false,
	tools,
	sendMessage,
	stop,
}: ChatInputProps) {
	const [messageDraft, setMessageDraft] = useState("");

	function submit() {
		if (!messageDraft || isStreaming || disabled) return;
		sendMessage(messageDraft);
		setMessageDraft("");
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}

	return (
		<InputGroup>
			<InputGroupTextarea
				value={messageDraft}
				onChange={(event) => setMessageDraft(event.target.value)}
				placeholder="Message…"
				className="max-h-50 field-sizing-content resize-none"
				onKeyDown={handleKeyDown}
				disabled={disabled}
			/>
			<Separator />
			<InputGroupAddon align="block-end" className="p-2">
				<ModelPicker selection={selection} onSelect={onSelect} locked={locked} />
				{tools && <ToolsMenu {...tools} />}
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
