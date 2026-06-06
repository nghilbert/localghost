import { ArrowUpIcon, BotIcon, MessageSquareIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

type Props = {
	onSubmit: (message: string) => void;
	isStreaming: boolean;
	onStop?: () => void;
	disabled?: boolean;
	mode?: "chat" | "agent";
	onModeChange?: (mode: "chat" | "agent") => void;
};

export function ChatInput({
	onSubmit,
	isStreaming,
	onStop,
	disabled,
	mode = "chat",
	onModeChange,
}: Props) {
	const ref = useRef<HTMLTextAreaElement>(null);

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}

	function submit() {
		const value = ref.current?.value.trim();
		if (!value || isStreaming || disabled) return;
		onSubmit(value);
		if (ref.current) ref.current.value = "";
		resize();
	}

	function resize() {
		const el = ref.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	}

	return (
		<div
			className={cn(
				"flex flex-col rounded-2xl border bg-background shadow-sm",
				"transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring",
				disabled && "opacity-60",
			)}
		>
			<textarea
				ref={ref}
				rows={1}
				placeholder="Message…"
				className="max-h-[200px] flex-1 resize-none bg-transparent px-4 pt-3 pb-2 text-sm outline-none placeholder:text-muted-foreground"
				onKeyDown={handleKeyDown}
				onInput={resize}
				disabled={disabled}
			/>

			<div className="flex items-center justify-between px-2 pb-2">
				{/* Mode toggle */}
				{onModeChange ? (
					<div className="flex gap-1">
						<button
							type="button"
							onClick={() => onModeChange("chat")}
							className={cn(
								"flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
								mode === "chat"
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<MessageSquareIcon size={12} />
							Chat
						</button>
						<button
							type="button"
							onClick={() => onModeChange("agent")}
							className={cn(
								"flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
								mode === "agent"
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<BotIcon size={12} />
							Agent
						</button>
					</div>
				) : (
					<div />
				)}

				{/* Send / Stop */}
				{isStreaming ? (
					<Button
						size="icon"
						variant="outline"
						className="h-8 w-8 shrink-0 rounded-full"
						onClick={onStop}
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
			</div>
		</div>
	);
}
