import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
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
} from "#/components/ui/alert-dialog";
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
	const { conversations, renameConversation, deleteConversation } = useConversations();
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
								<Input
									ref={(el) => el?.select()}
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
