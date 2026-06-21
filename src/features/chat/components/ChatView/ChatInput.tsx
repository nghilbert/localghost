import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardAction, CardContent, CardFooter } from "#/components/ui/card";
import { Textarea } from "#/components/ui/textarea";
import { ToolsPicker } from "#/features/chat/components/ChatView/ToolsPicker";
import { useConversationSettings } from "#/features/chat/hooks/use-conversation-settings";
import { ModelPicker } from "#/features/endpoints/components/ModelPicker";
import { modelCapabilitiesQueryOptions } from "#/features/endpoints/lib/endpoint.functions";

type ChatInputProps = {
	conversationId: string;
	isStreaming: boolean;
	enabledTools: string[];
	onEnabledToolsChange: (enabledTools: string[]) => void;
	sendMessage: (content: string) => Promise<void>;
	stop: () => void;
};

export function ChatInput({
	conversationId,
	isStreaming,
	enabledTools,
	onEnabledToolsChange,
	sendMessage,
	stop,
}: ChatInputProps) {
	const { model, endpointId, isReady, setModel } = useConversationSettings(conversationId);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const { data: capabilities } = useQuery({
		...modelCapabilitiesQueryOptions(endpointId ?? "", model),
		enabled: Boolean(endpointId && model),
	});
	const supportsTools = capabilities?.supportsTools ?? true;

	// A model that can't use tools must never carry a stale selection into a send.
	useEffect(() => {
		if (!supportsTools && enabledTools.length > 0) onEnabledToolsChange([]);
	}, [supportsTools, enabledTools.length, onEnabledToolsChange]);

	function submit() {
		const value = textareaRef.current?.value.trim();
		if (!value || isStreaming || !isReady) return;
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
					disabled={!isReady}
				/>
			</CardContent>

			<CardFooter className="justify-between gap-2">
				<CardAction className="flex items-center gap-2">
					<ModelPicker
						currentModel={model}
						currentEndpointId={endpointId}
						onSelect={setModel}
						needsAttention={!isReady}
						className="max-w-50"
					/>
					<ToolsPicker
						enabledTools={enabledTools}
						supportsTools={supportsTools}
						onChange={onEnabledToolsChange}
					/>
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
							disabled={!isReady}
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
