import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArchiveIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
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
	searchMessages,
	sessionsQueryOptions,
	updateSession,
} from "#/features/chat/lib/chat.functions";

export function SessionList() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: sessions = [] } = useQuery(sessionsQueryOptions());
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [searchOpen, setSearchOpen] = useState(false);

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
		<>
			<SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} navigate={navigate} />
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
							onClick={() => createMut.mutate()}
							disabled={createMut.isPending}
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
		</>
	);
}

type SearchResult = {
	messageId: string;
	sessionId: string;
	sessionName: string;
	role: string;
	snippet: string;
	createdAt: Date | string;
};

function SearchDialog({
	open,
	onClose,
	navigate,
}: {
	open: boolean;
	onClose: () => void;
	navigate: ReturnType<typeof useNavigate>;
}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);

	async function handleSearch(q: string) {
		setQuery(q);
		if (!q.trim()) {
			setResults([]);
			return;
		}
		setLoading(true);
		try {
			const res = await searchMessages({ data: { query: q } });
			setResults(res);
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	}

	function openSession(sessionId: string) {
		navigate({ to: "/sessions/$sessionId", params: { sessionId } });
		onClose();
	}

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Search chats</DialogTitle>
				</DialogHeader>
				<div className="relative">
					<SearchIcon size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
					<input
						type="text"
						value={query}
						onChange={(e) => handleSearch(e.target.value)}
						placeholder="Search messages…"
						className="w-full rounded-md border bg-background py-2 pl-8 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring"
					/>
					{query && (
						<button
							type="button"
							onClick={() => {
								setQuery("");
								setResults([]);
							}}
							className="absolute right-2.5 top-2.5 text-muted-foreground"
						>
							<XIcon size={13} />
						</button>
					)}
				</div>
				<div className="max-h-80 space-y-1 overflow-auto">
					{loading && <p className="py-4 text-center text-xs text-muted-foreground">Searching…</p>}
					{!loading && results.length === 0 && query && (
						<p className="py-4 text-center text-xs text-muted-foreground">No results</p>
					)}
					{results.map((r) => (
						<button
							key={r.messageId}
							type="button"
							onClick={() => openSession(r.sessionId)}
							className="w-full rounded-md p-2.5 text-left hover:bg-muted"
						>
							<p className="text-xs font-medium text-muted-foreground">{r.sessionName}</p>
							<p className="mt-0.5 truncate text-sm">{r.snippet}</p>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
