import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { DownloadIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/shared/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "#/shared/components/ui/dropdown-menu";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarInput,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/shared/components/ui/sidebar";
import { toast } from "#/shared/components/ui/toast";
import {
	conversationQueryOptions,
	conversationSearchQueryOptions,
} from "#/shared/domain/conversation/conversation.functions";
import {
	conversationExportFilename,
	conversationToJson,
	conversationToMarkdown,
} from "#/shared/domain/conversation/export";
import {
	mergeSearchResults,
	type SearchableConversation,
	snippetSegments,
} from "#/shared/domain/conversation/search";
import { useConversations } from "#/shared/domain/conversation/use-conversations";
import { useDebouncedValue } from "#/shared/hooks/use-debounced-value";
import { downloadTextFile } from "#/shared/lib/download";
import { ChatRenameForm } from "./ChatRenameForm";

export function RecentChatList() {
	const { conversations, deleteConversation } = useConversations();
	const queryClient = useQueryClient();
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const navigate = useNavigate();

	const { conversationId: currentConversationId } = useParams({ strict: false });
	const pendingDelete = conversations.find((c) => c.id === pendingDeleteId);

	const query = search.trim();
	// Debounced so typing doesn't fire a server request per keystroke; the title
	// filter below still updates instantly since it's local.
	const debouncedQuery = useDebouncedValue(query, 300);
	// Instant title filter, plus a server-side full-text search over message bodies
	// (only fired once there's a query); results merge with titles ranked first.
	// `keepPreviousData` keeps the last match list on screen between keystrokes
	// instead of blanking the list while the new query is in flight.
	const { data: contentMatches } = useQuery({
		...conversationSearchQueryOptions({ query: debouncedQuery }),
		enabled: debouncedQuery.length > 0,
		placeholderData: keepPreviousData,
	});
	const lowerQuery = query.toLowerCase();
	const titleMatches = conversations.filter((c) =>
		(c.title ?? "").toLowerCase().includes(lowerQuery),
	);
	const visibleConversations: SearchableConversation[] = query
		? mergeSearchResults({ titleMatches, contentMatches: contentMatches ?? [] })
		: conversations;

	async function exportConversation({ id, format }: { id: string; format: "markdown" | "json" }) {
		try {
			const conversation = await queryClient.ensureQueryData(conversationQueryOptions(id));
			const extension = format === "markdown" ? "md" : "json";
			downloadTextFile({
				filename: conversationExportFilename({ title: conversation.title, extension }),
				text:
					format === "markdown"
						? conversationToMarkdown(conversation)
						: conversationToJson(conversation),
				type: format === "markdown" ? "text/markdown" : "application/json",
			});
			toast.add({ title: "Chat exported", type: "success" });
		} catch (error) {
			toast.add({
				title: "Failed to export chat",
				type: "error",
				description: error instanceof Error ? error.message : undefined,
			});
		}
	}

	function confirmDelete(id: string) {
		deleteConversation.mutate(id, {
			onSuccess: () => {
				if (id === currentConversationId) navigate({ to: "/new" });
			},
		});
		setPendingDeleteId(null);
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel className="flex items-center justify-between pr-1">
				Recent Chats
			</SidebarGroupLabel>
			<SidebarGroupContent>
				{conversations.length > 0 && (
					<SidebarInput
						type="search"
						placeholder="Search chats"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						data-testid="chat-search-input"
						className="mb-1"
					/>
				)}
				<SidebarMenu>
					{visibleConversations.map((conversation) => (
						<SidebarMenuItem key={conversation.id}>
							{renamingId === conversation.id ? (
								<ChatRenameForm conversation={conversation} onDone={() => setRenamingId(null)} />
							) : (
								<SidebarMenuButton
									render={
										<Link to="/chat/$conversationId" params={{ conversationId: conversation.id }} />
									}
									isActive={currentConversationId === conversation.id}
									tooltip={conversation.title}
									onDoubleClick={() => setRenamingId(conversation.id)}
									className={
										conversation.snippet ? "h-auto flex-col items-start gap-0.5" : undefined
									}
								>
									<span className="w-full truncate">{conversation.title}</span>
									{conversation.snippet && (
										<span className="w-full truncate text-xs text-muted-foreground">
											{snippetSegments(conversation.snippet).map((segment) =>
												segment.highlight ? (
													<strong key={segment.start} className="font-medium text-foreground">
														{segment.text}
													</strong>
												) : (
													<span key={segment.start}>{segment.text}</span>
												),
											)}
										</span>
									)}
								</SidebarMenuButton>
							)}
							<DropdownMenu>
								<DropdownMenuTrigger render={<SidebarMenuAction />}>
									<MoreHorizontalIcon size={14} />
									<span className="sr-only">Chat actions</span>
								</DropdownMenuTrigger>
								<DropdownMenuContent side="right" align="start" className="min-w-36">
									<DropdownMenuGroup>
										<DropdownMenuItem onClick={() => setRenamingId(conversation.id)}>
											<PencilIcon size={13} className="mr-2" />
											Rename
										</DropdownMenuItem>
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												<DownloadIcon size={13} className="mr-2" />
												Export
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent>
												<DropdownMenuItem
													onClick={() =>
														void exportConversation({ id: conversation.id, format: "markdown" })
													}
												>
													Markdown
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() =>
														void exportConversation({ id: conversation.id, format: "json" })
													}
												>
													JSON
												</DropdownMenuItem>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
										<DropdownMenuItem
											variant="destructive"
											onClick={() => setPendingDeleteId(conversation.id)}
										>
											<Trash2Icon size={13} className="mr-2" />
											Delete
										</DropdownMenuItem>
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					))}
					{conversations.length === 0 && (
						<p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p>
					)}
					{conversations.length > 0 && visibleConversations.length === 0 && (
						<p className="px-2 py-3 text-xs text-muted-foreground">No chats match your search.</p>
					)}
				</SidebarMenu>
			</SidebarGroupContent>
			<AlertDialog
				open={pendingDeleteId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDeleteId(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this chat?</AlertDialogTitle>
						<AlertDialogDescription>
							"{pendingDelete?.title}" and its messages will be permanently deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								if (pendingDeleteId) confirmDelete(pendingDeleteId);
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarGroup>
	);
}
