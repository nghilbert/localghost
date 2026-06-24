import { Link, useParams } from "@tanstack/react-router";
import { ArchiveIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/components/ui/sidebar";
import { useConversations } from "#/features/chat/hooks/use-conversations";

export function RecentChatList() {
	const { conversations, renameConversation, archiveConversation, deleteConversation } =
		useConversations();
	const [renamingId, setRenamingId] = useState<string | null>(null);

	const { conversationId: currentConversationId } = useParams({ strict: false });

	return (
		<SidebarGroup>
			<SidebarGroupLabel className="flex items-center justify-between pr-1">
				Recent Chats
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{conversations.map((conversation) => (
						<SidebarMenuItem key={conversation.id}>
							{renamingId === conversation.id ? (
								<Input
									ref={(el) => el?.focus()}
									defaultValue={conversation.title}
									className="h-7"
									onBlur={(e) => {
										const title = e.target.value.trim();
										if (title && title !== conversation.title) {
											renameConversation.mutate(
												{ id: conversation.id, title },
												{ onSuccess: () => setRenamingId(null) },
											);
										} else {
											setRenamingId(null);
										}
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") e.currentTarget.blur();
										if (e.key === "Escape") setRenamingId(null);
									}}
								/>
							) : (
								<SidebarMenuButton
									asChild
									isActive={currentConversationId === conversation.id}
									tooltip={conversation.title}
									onDoubleClick={() => setRenamingId(conversation.id)}
								>
									<Link to="/chat/$conversationId" params={{ conversationId: conversation.id }}>
										<span className="truncate">{conversation.title}</span>
									</Link>
								</SidebarMenuButton>
							)}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuAction>
										<MoreHorizontalIcon size={14} />
										<span className="sr-only">Chat actions</span>
									</SidebarMenuAction>
								</DropdownMenuTrigger>
								<DropdownMenuContent side="right" align="start" className="min-w-36">
									<DropdownMenuItem onClick={() => archiveConversation.mutate(conversation.id)}>
										<ArchiveIcon size={13} className="mr-2" />
										Archive
									</DropdownMenuItem>
									<DropdownMenuItem
										variant="destructive"
										onClick={() => deleteConversation.mutate(conversation.id)}
									>
										<Trash2Icon size={13} className="mr-2" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					))}
					{conversations.length === 0 && (
						<p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p>
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
