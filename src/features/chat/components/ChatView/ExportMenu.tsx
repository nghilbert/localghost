import type { UIMessage } from "@tanstack/ai-client";
import { DownloadIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { partsText } from "#/features/chat/lib/message-text";
import { downloadBlob } from "#/lib/download";
import { cn } from "#/lib/utils";

type ExportMenuProps = {
	conversation: { id: string; title: string; model: string };
	messages: UIMessage[];
	className?: string;
};

export function ExportMenu({ conversation, messages, className }: ExportMenuProps) {
	function exportAs(format: "md" | "json") {
		const filename = `${conversation.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${format === "md" ? "md" : "json"}`;
		const flattened = messages.map((message) => ({
			id: message.id,
			role: message.role,
			content: partsText(message.parts),
		}));
		let content: string;
		if (format === "md") {
			content = `# ${conversation.title}\n\n`;
			for (const message of flattened) {
				const role = message.role === "user" ? "**You**" : "**Assistant**";
				content += `${role}\n\n${message.content}\n\n---\n\n`;
			}
		} else {
			content = JSON.stringify(
				{
					conversation: {
						id: conversation.id,
						title: conversation.title,
						model: conversation.model,
					},
					messages: flattened,
				},
				null,
				2,
			);
		}
		downloadBlob(filename, content, format === "md" ? "text/markdown" : "application/json");
	}

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className={cn("h-7 gap-1 px-2 text-xs text-muted-foreground", className)}
							aria-label="Export conversation"
						>
							<DownloadIcon size={13} />
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>Export conversation</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="min-w-36">
				<DropdownMenuItem onClick={() => exportAs("md")}>Export as Markdown</DropdownMenuItem>
				<DropdownMenuItem onClick={() => exportAs("json")}>Export as JSON</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
