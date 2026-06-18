import { ArrowUpIcon, BotIcon, MessageSquareIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardAction, CardContent, CardFooter } from "#/components/ui/card";
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";

type Props = {
	onSubmit: (message: string) => void;
	isStreaming: boolean;
	onStop?: () => void;
	disabled?: boolean;
	mode?: "chat" | "agent";
	onModeChange?: (mode: "chat" | "agent") => void;
	modelSelect?: ReactNode;
};

export function ChatInput({
	onSubmit,
	isStreaming,
	onStop,
	disabled,
	mode = "chat",
	onModeChange,
	modelSelect,
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
	}

	return (
		<Card>
			<CardContent>
				<Textarea
					ref={ref}
					rows={1}
					placeholder="Message…"
					className="max-h-50 field-sizing-content resize-none"
					onKeyDown={handleKeyDown}
					disabled={disabled}
				/>
			</CardContent>
			<CardFooter className="justify-between gap-2">
				<CardAction className="flex items-center gap-2">
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						value={mode}
						onValueChange={(value) => {
							if (!onModeChange) return;
							if (value === "chat" || value === "agent") onModeChange(value);
						}}
					>
						<ToggleGroupItem value="chat">
							<MessageSquareIcon size={12} />
							Chat
						</ToggleGroupItem>
						<ToggleGroupItem value="agent">
							<BotIcon size={12} />
							Agent
						</ToggleGroupItem>
					</ToggleGroup>
					{modelSelect}
				</CardAction>

				<CardAction>
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
				</CardAction>
			</CardFooter>
		</Card>
	);
}
