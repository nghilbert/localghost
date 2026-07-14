import { ArrowUpIcon, PaperclipIcon, SquareIcon } from "lucide-react";
import {
	type ChangeEvent,
	type ClipboardEvent,
	type DragEvent,
	type KeyboardEvent,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import type { ModelSelection } from "#/entities/endpoint/types";
import { AttachmentPreviews } from "#/features/send-message/components/ChatInput/AttachmentPreviews";
import { LockedModel } from "#/features/send-message/components/ChatInput/LockedModel";
import { ModelPicker } from "#/features/send-message/components/ChatInput/ModelPicker";
import {
	type ToolControls,
	ToolsMenu,
} from "#/features/send-message/components/ChatInput/ToolsMenu";
import {
	type ImageAttachment,
	isImageFile,
	readImageAttachment,
} from "#/features/send-message/lib/attachments";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "#/shared/ui/input-group";
import { Separator } from "#/shared/ui/separator";
import { Spinner } from "#/shared/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/ui/tooltip";

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
	/** Whether the selected model accepts image attachments; hides the affordance when false. */
	supportsImages?: boolean;
	/** A send is in flight (e.g. the draft page creating the conversation). */
	isSending?: boolean;
	sendMessage: (content: string, attachments: ImageAttachment[]) => void;
	stop?: () => void;
};

export function ChatInput({
	disabled = false,
	isStreaming,
	selection,
	onSelect,
	locked = false,
	tools,
	supportsImages = false,
	isSending = false,
	sendMessage,
	stop,
}: ChatInputProps) {
	const [messageDraft, setMessageDraft] = useState("");
	const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	// A missing model is the one disabled state the user can fix from here, so it
	// gets explicit guidance; a locked conversation explains itself via ModelPicker.
	const needsModel = !selection && !locked;

	async function addFiles(files: Iterable<File>) {
		const images = Array.from(files).filter(isImageFile);
		if (images.length === 0) {
			toast.error("Only image files can be attached");
			return;
		}
		try {
			const read = await Promise.all(images.map(readImageAttachment));
			setAttachments((prev) => [...prev, ...read]);
		} catch {
			toast.error("Couldn't read an image");
		}
	}

	function submit() {
		const content = messageDraft.trim();
		if ((!content && attachments.length === 0) || isStreaming || disabled) return;
		sendMessage(content, attachments);
		setMessageDraft("");
		setAttachments([]);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}

	function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
		if (!supportsImages) return;
		const images = Array.from(event.clipboardData.files).filter(isImageFile);
		if (images.length === 0) return;
		event.preventDefault();
		void addFiles(images);
	}

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		if (event.target.files) void addFiles(event.target.files);
		// Clear so re-picking the same file fires onChange again.
		event.target.value = "";
	}

	function handleDrop(event: DragEvent<HTMLDivElement>) {
		if (!supportsImages) return;
		event.preventDefault();
		setIsDragging(false);
		void addFiles(event.dataTransfer.files);
	}

	function handleDragOver(event: DragEvent<HTMLDivElement>) {
		if (!supportsImages) return;
		event.preventDefault();
		setIsDragging(true);
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
		<InputGroup
			data-dragging={isDragging || undefined}
			className="data-dragging:border-ring data-dragging:ring-3 data-dragging:ring-ring/50"
			onDragOver={handleDragOver}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
		>
			{attachments.length > 0 && (
				<InputGroupAddon align="block-start">
					<AttachmentPreviews
						attachments={attachments}
						onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
					/>
				</InputGroupAddon>
			)}
			<InputGroupTextarea
				value={messageDraft}
				onChange={(event) => setMessageDraft(event.target.value)}
				placeholder={needsModel ? "Pick a model to start…" : "Message…"}
				className="max-h-50 field-sizing-content resize-none"
				onKeyDown={handleKeyDown}
				onPaste={handlePaste}
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
				{supportsImages && (
					<>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/png,image/jpeg,image/webp,image/gif"
							multiple
							hidden
							data-testid="attach-image-input"
							onChange={handleFileChange}
						/>
						<Tooltip>
							<TooltipTrigger
								render={
									<InputGroupButton
										type="button"
										variant="ghost"
										size="icon-sm"
										aria-label="Attach images"
										data-testid="attach-image-button"
										disabled={disabled}
										onClick={() => fileInputRef.current?.click()}
									/>
								}
							>
								<PaperclipIcon size={14} />
							</TooltipTrigger>
							<TooltipContent>Attach images</TooltipContent>
						</Tooltip>
					</>
				)}
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
