import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon, FileIcon, FolderIcon } from "lucide-react";
import { useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/shared/components/ui/collapsible";
import { Spinner } from "#/shared/components/ui/spinner";
import { codeAgentWorkspaceEntriesQueryOptions } from "#/shared/domain/code-agent/code-agent.functions";
import type { WorkspaceEntry } from "#/shared/domain/code-agent/workspace-path.server";
import { cn } from "#/shared/lib/utils";

/** A session's workspace as a read-only, click-to-expand tree. Nothing here writes or opens a file. */
export function WorkspacePanel({ workspacePath }: { workspacePath: string }) {
	const { data } = useQuery(codeAgentWorkspaceEntriesQueryOptions(workspacePath));

	return (
		<nav aria-label="Workspace files" className="h-full overflow-y-auto p-2 text-sm">
			{data ? (
				<WorkspaceTreeLevel path={workspacePath} entries={data.entries} depth={0} />
			) : (
				<Spinner className="mx-auto text-muted-foreground" />
			)}
		</nav>
	);
}

function WorkspaceTreeLevel({
	path,
	entries,
	depth,
}: {
	path: string;
	entries: WorkspaceEntry[];
	depth: number;
}) {
	return (
		<ul>
			{entries.map((entry) => (
				<li key={entry.name}>
					<WorkspaceTreeNode path={`${path}/${entry.name}`} entry={entry} depth={depth} />
				</li>
			))}
		</ul>
	);
}

function WorkspaceTreeNode({
	path,
	entry,
	depth,
}: {
	path: string;
	entry: WorkspaceEntry;
	depth: number;
}) {
	const [open, setOpen] = useState(false);
	const { data } = useQuery({
		...codeAgentWorkspaceEntriesQueryOptions(path),
		enabled: entry.kind === "directory" && open,
	});
	const indent = { paddingLeft: `${depth * 1.25}rem` };

	if (entry.kind === "file") {
		return (
			<div className="flex items-center gap-1.5 py-1 text-muted-foreground" style={indent}>
				<FileIcon className="size-3.5 shrink-0" />
				<span className="truncate">{entry.name}</span>
			</div>
		);
	}

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger
				data-testid={`workspace-tree-toggle-${entry.name}`}
				className="flex w-full items-center gap-1.5 rounded py-1 hover:bg-muted"
				style={indent}
			>
				<ChevronRightIcon
					className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
				/>
				<FolderIcon className="size-3.5 shrink-0" />
				<span className="truncate">{entry.name}</span>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{data && <WorkspaceTreeLevel path={path} entries={data.entries} depth={depth + 1} />}
			</CollapsibleContent>
		</Collapsible>
	);
}
