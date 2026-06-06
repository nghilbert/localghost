import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArchiveIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/components/ui/sidebar";
import {
	createSession,
	sessionsQueryOptions,
	updateSession,
} from "#/features/chat/lib/chat.functions";

export function SessionList() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: sessions = [] } = useQuery(sessionsQueryOptions());
	const [renamingId, setRenamingId] = useState<string | null>(null);

	const params = useParams({ strict: false }) as { sessionId?: string };
	const currentSessionId = params.sessionId;

	const createMut = useMutation({
		mutationFn: () => createSession({ data: { name: "New Chat" } }),
		onSuccess: (session) => {
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
			navigate({ to: "/sessions/$sessionId", params: { sessionId: session.id } });
		},
	});

	const archiveMut = useMutation({
		mutationFn: (id: string) => updateSession({ data: { id, data: { archived: true } } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
	});

	const renameMut = useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			updateSession({ data: { id, data: { name } } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
			setRenamingId(null);
		},
	});

	return (
		<SidebarGroup>
			<SidebarGroupLabel className="flex items-center justify-between pr-1">
				Chats
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => createMut.mutate()}
					disabled={createMut.isPending}
				>
					<PlusIcon size={14} />
					<span className="sr-only">New chat</span>
				</Button>
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{sessions.map((session) => (
						<SidebarMenuItem key={session.id}>
							{renamingId === session.id ? (
								<input
									ref={(el) => el?.focus()}
									defaultValue={session.name}
									className="w-full rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
									onBlur={(e) => {
										const name = e.target.value.trim();
										if (name && name !== session.name) {
											renameMut.mutate({ id: session.id, name });
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
							<SidebarMenuAction onClick={() => archiveMut.mutate(session.id)} title="Archive">
								<ArchiveIcon size={14} />
							</SidebarMenuAction>
						</SidebarMenuItem>
					))}
					{sessions.length === 0 && (
						<p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p>
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
