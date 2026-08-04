import { ArrowUpIcon, PaperclipIcon, SquareIcon } from "lucide-react";
import {
	type ChangeEvent,
	type ClipboardEvent,
	type DragEvent,
	type FormEvent,
	type KeyboardEvent,
	useRef,
	useState,
} from "react";
import {
	type Attachment,
	attachmentAccept,
	isDocumentFile,
	isImageFile,
	MAX_ATTACHMENT_BYTES,
	readAttachment,
} from "#/routes/_authenticated/_chat/-lib/attachments";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "#/shared/components/ui/input-group";
import { Separator } from "#/shared/components/ui/separator";
import { Spinner } from "#/shared/components/ui/spinner";
import { toast } from "#/shared/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/components/ui/tooltip";
import type { ModelSelection } from "#/shared/domain/endpoint/types";
import { AttachmentPreviews } from "./AttachmentPreviews";
import { LockedModelLabel } from "./LockedModelLabel";
import { ModelPicker } from "./ModelPicker";
import { type ToolControls, ToolsMenu } from "./ToolsMenu";

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
	/** Whether the selected model accepts document attachments (PDF/text); cloud Anthropic & Gemini. */
	supportsDocuments?: boolean;
	/** A send is in flight (e.g. the draft page creating the conversation). */
	isSending?: boolean;
	sendMessage: (content: string, attachments: Attachment[]) => void;
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
	supportsDocuments = false,
	isSending = false,
	sendMessage,
	stop,
}: ChatInputProps) {
	const [messageDraft, setMessageDraft] = useState("");
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	// A missing model is the one disabled state the user can fix from here, so it
	// gets explicit guidance; a locked conversation explains itself via ModelPicker.
	const needsModel = !selection && !locked;
	const canAttach = supportsImages || supportsDocuments;

	/** Whether a file is one of the kinds the selected model actually accepts. */
	function isAcceptedFile(file: File): boolean {
		return (supportsImages && isImageFile(file)) || (supportsDocuments && isDocumentFile(file));
	}

	async function addFiles(files: Iterable<File>) {
		const accepted = Array.from(files).filter(isAcceptedFile);
		if (accepted.length === 0) {
			toast.add({
				title: canAttach ? "That file type can't be attached" : "This model can't take files",
				type: "error",
			});
			return;
		}
		const withinLimit = accepted.filter((file) => {
			if (file.size <= MAX_ATTACHMENT_BYTES) return true;
			toast.add({ title: `${file.name} is too large (max 20 MB)`, type: "error" });
			return false;
		});
		if (withinLimit.length === 0) return;
		try {
			const read = await Promise.all(withinLimit.map(readAttachment));
			setAttachments((prev) => [...prev, ...read]);
		} catch {
			toast.add({ title: "Couldn't read a file", type: "error" });
		}
	}

	function submit() {
		const content = messageDraft.trim();
		if ((!content && attachments.length === 0) || isStreaming || disabled || needsModel) return;
		sendMessage(content, attachments);
		setMessageDraft("");
		setAttachments([]);
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		submit();
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			event.currentTarget.form?.requestSubmit();
		}
	}

	function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
		if (!canAttach) return;
		const files = Array.from(event.clipboardData.files).filter(isAcceptedFile);
		if (files.length === 0) return;
		event.preventDefault();
		void addFiles(files);
	}

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		if (event.target.files) void addFiles(event.target.files);
		// Clear so re-picking the same file fires onChange again.
		event.target.value = "";
	}

	function handleDrop(event: DragEvent<HTMLDivElement>) {
		if (!canAttach) return;
		event.preventDefault();
		setIsDragging(false);
		void addFiles(event.dataTransfer.files);
	}

	function handleDragOver(event: DragEvent<HTMLDivElement>) {
		if (!canAttach) return;
		event.preventDefault();
		setIsDragging(true);
	}

	const stopping = Boolean(isStreaming && stop);
	const inactive = !stopping && (needsModel || disabled);
	const attachLabel =
		supportsImages && supportsDocuments
			? "Attach images or documents"
			: supportsDocuments
				? "Attach documents"
				: "Attach images";
	const sendIcon = stopping ? (
		<SquareIcon size={14} />
	) : isSending ? (
		<Spinner className="size-3.5" />
	) : (
		<ArrowUpIcon size={14} />
	);

	return (
		<form onSubmit={handleSubmit} data-testid="chat-input-form">
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
					data-testid="chat-input-textarea"
					value={messageDraft}
					onChange={(event) => setMessageDraft(event.target.value)}
					placeholder={needsModel ? "Pick a model to start…" : "Message…"}
					className="max-h-50 field-sizing-content resize-none"
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					disabled={disabled}
					readOnly={needsModel}
					spellCheck={true}
				/>
				<Separator />
				<InputGroupAddon align="block-end" className="p-2">
					{locked ? (
						<LockedModelLabel selection={selection} />
					) : (
						<ModelPicker selection={selection} onSelect={onSelect} />
					)}
					{tools && <ToolsMenu {...tools} />}
					{canAttach && (
						<>
							<input
								ref={fileInputRef}
								type="file"
								accept={attachmentAccept({
									images: supportsImages,
									documents: supportsDocuments,
								})}
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
											aria-label={attachLabel}
											data-testid="attach-image-button"
											disabled={disabled}
											onClick={() => fileInputRef.current?.click()}
										/>
									}
								>
									<PaperclipIcon size={14} />
								</TooltipTrigger>
								<TooltipContent>{attachLabel}</TooltipContent>
							</Tooltip>
						</>
					)}
					{/* aria-disabled keeps pointer events, so the button is its own tooltip trigger. */}
					<Tooltip>
						<TooltipTrigger
							render={
								<InputGroupButton
									type={stopping ? "button" : "submit"}
									variant={stopping ? "outline" : "default"}
									size="icon-sm"
									className="ml-auto aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
									aria-disabled={inactive || undefined}
									data-testid="chat-input-submit"
									onClick={stopping ? stop : undefined}
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
		</form>
	);
}
