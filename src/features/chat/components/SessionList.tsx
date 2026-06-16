import { Link, useParams } from "@tanstack/react-router";
import { ArchiveIcon, GitForkIcon, MoreHorizontalIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
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
import { SearchSessionsDialog } from "#/features/chat/components/SearchSessionsDialog";
import { useSessions } from "#/features/chat/hooks/use-sessions";

export function SessionList() {
	const { sessions, createSession, renameSession, archiveSession, forkSession } = useSessions();
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [searchOpen, setSearchOpen] = useState(false);

	const { sessionId: currentSessionId } = useParams({ strict: false });

	return (
		<>
			<SearchSessionsDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
			<SidebarGroup>
				<SidebarGroupLabel className="flex items-center justify-between pr-1">
					Chats
					<div className="flex items-center gap-0.5">
						<Button variant="ghost" size="icon-sm" onClick={() => setSearchOpen(true)}>
							<SearchIcon size={13} />
							<span className="sr-only">Search chats</span>
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => createSession.mutate()}
							disabled={createSession.isPending}
						>
							<PlusIcon size={14} />
							<span className="sr-only">New chat</span>
						</Button>
					</div>
				</SidebarGroupLabel>
				<SidebarGroupContent>
					<SidebarMenu>
						{sessions.map((session) => (
							<SidebarMenuItem key={session.id}>
								{renamingId === session.id ? (
									<Input
										ref={(el) => el?.focus()}
										defaultValue={session.name}
										className="h-7"
										onBlur={(e) => {
											const name = e.target.value.trim();
											if (name && name !== session.name) {
												renameSession.mutate(
													{ id: session.id, name },
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
										isActive={currentSessionId === session.id}
										tooltip={session.name}
										onDoubleClick={() => setRenamingId(session.id)}
									>
										<Link to="/sessions/$sessionId" params={{ sessionId: session.id }}>
											<span className="truncate">{session.name}</span>
										</Link>
									</SidebarMenuButton>
								)}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<SidebarMenuAction>
											<MoreHorizontalIcon size={14} />
											<span className="sr-only">Session actions</span>
										</SidebarMenuAction>
									</DropdownMenuTrigger>
									<DropdownMenuContent side="right" align="start" className="min-w-36">
										<DropdownMenuItem onClick={() => forkSession.mutate(session.id)}>
											<GitForkIcon size={13} className="mr-2" />
											Fork
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => archiveSession.mutate(session.id)}>
											<ArchiveIcon size={13} className="mr-2" />
											Archive
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						))}
						{sessions.length === 0 && (
							<p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p>
						)}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>
		</>
	);
}
