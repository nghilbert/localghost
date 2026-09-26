import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { DownloadIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "#/components/layout/ConfirmDeleteDialog";
import { Menu } from "#/components/ui/menu";
import { Sidebar } from "#/components/ui/sidebar";
import { chatQueries } from "#/features/chat/chat.queries";
import { useDeleteConversation } from "#/features/chat/hooks/use-delete-conversation";
import { useExportConversation } from "#/features/chat/hooks/use-export-conversation";
import {
	mergeSearchResults,
	type SearchableConversation,
	snippetSegments,
} from "#/features/chat/lib/chat-search";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { ChatRenameForm } from "./ChatRenameForm";

/** The user's chats, searchable by title and message text. */
export function RecentChatList() {
	const { data: conversations = [] } = useQuery(chatQueries.list());
	const deleteConversation = useDeleteConversation();
	const exportConversation = useExportConversation();
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const navigate = useNavigate();

	const { conversationId: currentConversationId } = useParams({ strict: false });
	const pendingDelete = conversations.find((c) => c.id === pendingDeleteId);

	const query = search.trim();
	// Debounced so typing sends one search, not one per key. Titles still filter instantly.
	const debouncedQuery = useDebouncedValue({ value: query, delayMs: 300 });
	// Messages are searched on the server; title matches rank first.
	const { data: contentMatches } = useQuery({
		...chatQueries.search(debouncedQuery),
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

	function confirmDelete(id: string) {
		deleteConversation.mutate(id, {
			onSuccess: () => {
				setPendingDeleteId(null);
				if (id === currentConversationId) navigate({ to: "/new" });
			},
		});
	}

	return (
		<Sidebar.Group>
			<Sidebar.GroupLabel className="flex items-center justify-between pr-1">
				Recent Chats
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				{conversations.length > 0 && (
					<Sidebar.Input
						type="search"
						placeholder="Search chats"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						aria-label="Search chats"
						className="mb-1"
					/>
				)}
				<Sidebar.Menu>
					{visibleConversations.map((conversation) => (
						<Sidebar.MenuItem key={conversation.id}>
							{renamingId === conversation.id ? (
								<ChatRenameForm conversation={conversation} onDone={() => setRenamingId(null)} />
							) : (
								<Sidebar.MenuButton
									render={
										<Link to="/chat/$conversationId" params={{ conversationId: conversation.id }} />
									}
									active={currentConversationId === conversation.id}
									tooltip={conversation.title}
									onDoubleClick={() => setRenamingId(conversation.id)}
									className={
										conversation.snippet ? "h-auto flex-col items-start gap-0.5" : undefined
									}
								>
									<span className="w-full truncate">{conversation.title}</span>
									{conversation.snippet && (
										<span className="w-full truncate text-xs text-muted-fg">
											{snippetSegments(conversation.snippet).map((segment) =>
												segment.highlight ? (
													<strong key={segment.start} className="font-medium text-fg">
														{segment.text}
													</strong>
												) : (
													<span key={segment.start}>{segment.text}</span>
												),
											)}
										</span>
									)}
								</Sidebar.MenuButton>
							)}
							<Menu.Root>
								<Menu.Trigger render={<Sidebar.MenuAction />}>
									<MoreHorizontalIcon />
									<span className="sr-only">Chat actions</span>
								</Menu.Trigger>
								<Menu.Content side="right" align="start" className="min-w-36">
									<Menu.Group>
										<Menu.Item onClick={() => setRenamingId(conversation.id)}>
											<PencilIcon />
											Rename
										</Menu.Item>
										<Menu.SubmenuRoot>
											<Menu.SubmenuTrigger>
												<DownloadIcon />
												Export
											</Menu.SubmenuTrigger>
											<Menu.Content>
												<Menu.Item
													onClick={() =>
														exportConversation.mutate({ id: conversation.id, format: "markdown" })
													}
												>
													Markdown
												</Menu.Item>
												<Menu.Item
													onClick={() =>
														exportConversation.mutate({ id: conversation.id, format: "json" })
													}
												>
													JSON
												</Menu.Item>
											</Menu.Content>
										</Menu.SubmenuRoot>
										<Menu.Item color="danger" onClick={() => setPendingDeleteId(conversation.id)}>
											<Trash2Icon />
											Delete
										</Menu.Item>
									</Menu.Group>
								</Menu.Content>
							</Menu.Root>
						</Sidebar.MenuItem>
					))}
					{conversations.length === 0 && (
						<p className="px-2 py-3 text-xs text-muted-fg">No chats yet.</p>
					)}
					{conversations.length > 0 && visibleConversations.length === 0 && (
						<p className="px-2 py-3 text-xs text-muted-fg">No chats match your search.</p>
					)}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
			<ConfirmDeleteDialog
				open={pendingDeleteId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDeleteId(null);
				}}
				title="Delete this chat?"
				description={`"${pendingDelete?.title}" and its messages will be permanently deleted.`}
				isPending={deleteConversation.isPending}
				onConfirm={() => {
					if (pendingDeleteId) confirmDelete(pendingDeleteId);
				}}
			/>
		</Sidebar.Group>
	);
}
