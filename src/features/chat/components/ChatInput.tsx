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
		<div className="flex flex-col gap-1">
			<div className="flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
				<textarea
					ref={ref}
					rows={1}
					placeholder="Message…"
					className={cn(
						"max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground",
					)}
					onKeyDown={handleKeyDown}
					onInput={resize}
					disabled={disabled}
				/>
				{isStreaming ? (
					<Button size="icon" variant="outline" className="shrink-0" onClick={onStop}>
						<SquareIcon size={16} />
						<span className="sr-only">Stop</span>
					</Button>
				) : (
					<Button size="icon" className="shrink-0" onClick={submit} disabled={disabled}>
						<ArrowUpIcon size={16} />
						<span className="sr-only">Send</span>
					</Button>
				)}
			</div>
			{onModeChange && (
				<div className="flex gap-1 px-1">
					<Button
						variant={mode === "chat" ? "secondary" : "ghost"}
						size="xs"
						onClick={() => onModeChange("chat")}
						className="gap-1 text-xs"
					>
						<MessageSquareIcon size={12} />
						Chat
					</Button>
					<Button
						variant={mode === "agent" ? "secondary" : "ghost"}
						size="xs"
						onClick={() => onModeChange("agent")}
						className="gap-1 text-xs"
					>
						<BotIcon size={12} />
						Agent
					</Button>
				</div>
			)}
		</div>
	);
}
