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
import { InputGroup } from "#/components/ui/input-group";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import { toast } from "#/components/ui/toast";
import { Tooltip } from "#/components/ui/tooltip";
import type { ToolControls } from "#/features/chat/chat.types";
import {
	type Attachment,
	attachmentAccept,
	isDocumentFile,
	isImageFile,
	MAX_ATTACHMENT_BYTES,
	readAttachment,
} from "#/features/chat/lib/attachments";
import { formatBytes } from "#/lib/format";
import type { ModelSelection } from "#/lib/llm-schemas";
import { AttachmentPreviews } from "./AttachmentPreviews";
import { LockedModelLabel } from "./LockedModelLabel";
import { ModelPicker } from "./ModelPicker";
import { ToolsMenu } from "./ToolsMenu";

type ChatInputProps = {
	disabled?: boolean;
	isStreaming: boolean;
	selection: ModelSelection | null;
	/** Only a new chat can change the model. */
	onSelect?: (selection: ModelSelection) => void;
	/** Shows the model as a label that cannot change, for a started conversation. */
	locked?: boolean;
	/** Tool switches for the next message. */
	tools?: ToolControls;
	/** Whether the model accepts images. */
	supportsImages?: boolean;
	/** Whether the model accepts documents such as PDFs. */
	supportsDocuments?: boolean;
	/** Whether a send is still in progress. */
	isSending?: boolean;
	sendMessage: (message: { content: string; attachments: Attachment[] }) => void;
	stop?: () => void;
};

/** The message box, with attachments, the model, and tool switches. */
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
	const needsModel = !selection && !locked;
	const canAttach = supportsImages || supportsDocuments;

	/** Whether the selected model accepts this kind of file. */
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
			toast.add({
				title: `${file.name} is too large (max ${formatBytes(MAX_ATTACHMENT_BYTES)})`,
				type: "error",
			});
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
		if ((!content && attachments.length === 0) || disabled || needsModel) return;
		sendMessage({ content, attachments });
		setMessageDraft("");
		setAttachments([]);
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		submit();
	}

	function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			event.currentTarget.closest("form")?.requestSubmit();
		}
	}

	function handlePaste(event: ClipboardEvent<HTMLElement>) {
		if (!canAttach) return;
		const files = Array.from(event.clipboardData.files).filter(isAcceptedFile);
		if (files.length === 0) return;
		event.preventDefault();
		void addFiles(files);
	}

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		if (event.target.files) void addFiles(event.target.files);
		// Cleared so picking the same file again fires `onChange`.
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
	const sendIcon = stopping ? <SquareIcon /> : isSending ? <Spinner size="sm" /> : <ArrowUpIcon />;

	return (
		<form aria-label="Send a message" onSubmit={handleSubmit}>
			<InputGroup.Root
				data-dragging={isDragging || undefined}
				className="data-dragging:ring-2 data-dragging:ring-ring"
				onDragOver={handleDragOver}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
			>
				{attachments.length > 0 && (
					<InputGroup.Addon align="block-start">
						<AttachmentPreviews
							attachments={attachments}
							onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
						/>
					</InputGroup.Addon>
				)}
				<InputGroup.Textarea
					aria-label="Message"
					value={messageDraft}
					onChange={(event) => setMessageDraft(event.target.value)}
					placeholder={needsModel ? "Pick a model to start..." : "Message..."}
					className="max-h-50 w-full"
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					disabled={disabled}
					readOnly={needsModel}
					spellCheck={true}
				/>
				<Separator />
				<InputGroup.Addon align="block-end" className="p-2">
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
								// Named apart from the visible button, which has the same label.
								aria-label={`${attachLabel} file`}
								accept={attachmentAccept({
									images: supportsImages,
									documents: supportsDocuments,
								})}
								multiple
								hidden
								onChange={handleFileChange}
							/>
							<Tooltip.Root>
								<Tooltip.Trigger
									render={
										<InputGroup.Button
											color="neutral"
											iconOnly
											aria-label={attachLabel}
											disabled={disabled}
											onClick={() => fileInputRef.current?.click()}
										/>
									}
								>
									<PaperclipIcon />
								</Tooltip.Trigger>
								<Tooltip.Content>{attachLabel}</Tooltip.Content>
							</Tooltip.Root>
						</>
					)}
					{/* aria-disabled keeps the tooltip working. */}
					<Tooltip.Root>
						<Tooltip.Trigger
							render={
								<InputGroup.Button
									type={stopping ? "button" : "submit"}
									color={stopping ? "neutral" : "primary"}
									variant={stopping ? "outlined" : "solid"}
									iconOnly
									className="ml-auto aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
									aria-disabled={inactive || undefined}
									onClick={stopping ? stop : undefined}
								/>
							}
						>
							{sendIcon}
							<span className="sr-only">{stopping ? "Stop" : "Send"}</span>
						</Tooltip.Trigger>
						{!stopping && needsModel && (
							<Tooltip.Content>Pick a model first. Use the model menu on the left.</Tooltip.Content>
						)}
					</Tooltip.Root>
				</InputGroup.Addon>
			</InputGroup.Root>
		</form>
	);
}
