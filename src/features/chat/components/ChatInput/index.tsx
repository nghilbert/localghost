import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "#/components/ui/input-group";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { LockedModel } from "#/features/chat/components/ChatInput/LockedModel";
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
	/** A send is in flight (e.g. the draft page creating the conversation). */
	isSending?: boolean;
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
	isSending = false,
	sendMessage,
	stop,
}: ChatInputProps) {
	const [messageDraft, setMessageDraft] = useState("");
	// A missing model is the one disabled state the user can fix from here, so it
	// gets explicit guidance; a locked conversation explains itself via ModelPicker.
	const needsModel = !selection && !locked;

	function submit() {
		const content = messageDraft.trim();
		if (!content || isStreaming || disabled) return;
		sendMessage(content);
		setMessageDraft("");
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}

	const stopping = Boolean(isStreaming && stop);
	const inactive = !stopping && (needsModel || disabled);
	const sendIcon = stopping ? (
		<SquareIcon size={14} />
	) : isSending ? (
		<Spinner className="size-3.5" />
	) : (
		<ArrowUpIcon size={14} />
	);

	return (
		<InputGroup>
			<InputGroupTextarea
				value={messageDraft}
				onChange={(event) => setMessageDraft(event.target.value)}
				placeholder={needsModel ? "Pick a model to start…" : "Message…"}
				className="max-h-50 field-sizing-content resize-none"
				onKeyDown={handleKeyDown}
				disabled={disabled}
				spellCheck={true}
			/>
			<Separator />
			<InputGroupAddon align="block-end" className="p-2">
				{locked ? (
					<LockedModel selection={selection} />
				) : (
					<ModelPicker selection={selection} onSelect={onSelect} />
				)}
				{tools && <ToolsMenu {...tools} />}
				{/* aria-disabled keeps pointer events, so the button is its own tooltip trigger. */}
				<Tooltip>
					<TooltipTrigger
						render={
							<InputGroupButton
								type="submit"
								variant={stopping ? "outline" : "default"}
								size="icon-sm"
								className="ml-auto aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
								aria-disabled={inactive || undefined}
								onClick={stopping ? stop : inactive ? undefined : submit}
							/>
						}
					>
						{sendIcon}
						<span className="sr-only">{stopping ? "Stop" : "Send"}</span>
					</TooltipTrigger>
					{!stopping && needsModel && (
						<TooltipContent>Pick a model first. Use the model menu on the left.</TooltipContent>
					)}
				</Tooltip>
			</InputGroupAddon>
		</InputGroup>
	);
}
