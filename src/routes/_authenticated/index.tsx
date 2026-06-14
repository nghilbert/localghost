import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, MessageSquarePlusIcon, StickyNoteIcon, TimerIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Item, ItemGroup } from "#/components/ui/item";
import { createSession, sessionsQueryOptions } from "#/features/chat/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

const QUICK_LINKS = [
	{ to: "/notes", label: "Notes", description: "Quick notes and checklists", icon: StickyNoteIcon },
	{ to: "/tasks", label: "Tasks", description: "Scheduled LLM prompts", icon: TimerIcon },
] as const;

function HomePage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: sessions = [] } = useQuery(sessionsQueryOptions());
	const recentSessions = sessions.slice(0, 5);

	const createMutation = useMutation({
		mutationFn: () => createSession({ data: { name: "New Chat" } }),
		onSuccess: (session) => {
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
			navigate({ to: "/sessions/$sessionId", params: { sessionId: session.id } });
		},
	});

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-10">
			<div className="mb-10 text-center">
				<h1 className="mb-1 text-2xl font-bold tracking-tight">Odysseus</h1>
				<p className="text-sm text-muted-foreground">Your self-hosted AI workspace</p>
			</div>

			<div className="mb-10 flex justify-center">
				<Button
					size="lg"
					className="gap-2 px-6"
					onClick={() => createMutation.mutate()}
					disabled={createMutation.isPending}
				>
					<MessageSquarePlusIcon size={16} />
					{createMutation.isPending ? "Creating…" : "New chat"}
				</Button>
			</div>

			{recentSessions.length > 0 && (
				<section className="mb-8">
					<h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Recent chats
					</h2>
					<ItemGroup>
						{recentSessions.map((s) => (
							<Item key={s.id} asChild>
								<Link to="/sessions/$sessionId" params={{ sessionId: s.id }}>
									<span className="flex-1 truncate text-sm font-medium">{s.name}</span>
									<ArrowRightIcon size={14} className="shrink-0 text-muted-foreground" />
								</Link>
							</Item>
						))}
					</ItemGroup>
				</section>
			)}

			<section>
				<h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					Workspace
				</h2>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
					{QUICK_LINKS.map(({ to, label, description, icon: Icon }) => (
						<Item key={to} asChild variant="outline" className="flex-col items-start">
							<Link to={to}>
								<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
									<Icon size={16} className="text-primary" />
								</div>
								<div>
									<p className="text-sm font-medium">{label}</p>
									<p className="text-xs text-muted-foreground">{description}</p>
								</div>
							</Link>
						</Item>
					))}
				</div>
			</section>
		</div>
	);
}
