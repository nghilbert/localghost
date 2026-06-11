import { DownloadIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";

type ExportableMessage = { id: string; role: string; content: string };

type ExportMenuProps = {
	session: { id: string; name: string; model: string };
	messages: ExportableMessage[];
};

export function ExportMenu({ session, messages }: ExportMenuProps) {
	function exportAs(format: "md" | "json") {
		const filename = `${session.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${format === "md" ? "md" : "json"}`;
		let content: string;
		if (format === "md") {
			content = `# ${session.name}\n\n`;
			for (const message of messages) {
				const role = message.role === "user" ? "**You**" : "**Assistant**";
				content += `${role}\n\n${message.content}\n\n---\n\n`;
			}
		} else {
			content = JSON.stringify(
				{
					session: { id: session.id, name: session.name, model: session.model },
					messages,
				},
				null,
				2,
			);
		}
		const blob = new Blob([content], {
			type: format === "md" ? "text/markdown" : "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="h-7 gap-1 px-2 text-xs text-muted-foreground"
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
