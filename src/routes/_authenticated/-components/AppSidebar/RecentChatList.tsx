import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useConversations } from "#/features/send-message/hooks/use-conversations";
import { ChatRenameForm } from "#/routes/_authenticated/-components/AppSidebar/ChatRenameForm";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/shared/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/shared/ui/dropdown-menu";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/shared/ui/sidebar";

export function RecentChatList() {
	const { conversations, deleteConversation } = useConversations();
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const navigate = useNavigate();

	const { conversationId: currentConversationId } = useParams({ strict: false });
	const pendingDelete = conversations.find((c) => c.id === pendingDeleteId);

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
				<SidebarMenu>
					{conversations.map((conversation) => (
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
								>
									<span className="truncate">{conversation.title}</span>
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
