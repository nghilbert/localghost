import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	CalendarIcon,
	FileTextIcon,
	GalleryHorizontalIcon,
	LayoutGridIcon,
	MailIcon,
	MessageSquarePlusIcon,
	SearchIcon,
	StickyNoteIcon,
	TimerIcon,
	UsersIcon,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { createSession, sessionsQueryOptions } from "#/features/chat/lib/chat.functions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

const QUICK_LINKS = [
	{ to: "/notes", label: "Notes", description: "Quick notes and checklists", icon: StickyNoteIcon },
	{
		to: "/documents",
		label: "Documents",
		description: "Write and version documents",
		icon: FileTextIcon,
	},
	{
		to: "/research",
		label: "Research",
		description: "Deep iterative web research",
		icon: SearchIcon,
	},
	{ to: "/contacts", label: "Contacts", description: "People and CardDAV sync", icon: UsersIcon },
	{ to: "/email", label: "Email", description: "Read and send email via IMAP", icon: MailIcon },
	{ to: "/calendar", label: "Calendar", description: "Events and CalDAV sync", icon: CalendarIcon },
	{ to: "/tasks", label: "Tasks", description: "Scheduled LLM prompts", icon: TimerIcon },
	{
		to: "/compare",
		label: "Compare",
		description: "Side-by-side model outputs",
		icon: LayoutGridIcon,
	},
	{
		to: "/gallery",
		label: "Gallery",
		description: "Upload and browse images",
		icon: GalleryHorizontalIcon,
	},
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
			{/* Hero */}
			<div className="mb-10 text-center">
				<h1 className="mb-1 text-2xl font-bold tracking-tight">Odysseus</h1>
				<p className="text-sm text-muted-foreground">Your self-hosted AI workspace</p>
			</div>

			{/* New chat CTA */}
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

			{/* Recent sessions */}
			{recentSessions.length > 0 && (
				<section className="mb-8">
					<h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Recent chats
					</h2>
					<ul className="space-y-1">
						{recentSessions.map((s) => (
							<li key={s.id}>
								<Link
									to="/sessions/$sessionId"
									params={{ sessionId: s.id }}
									className={cn(
										"flex items-center justify-between rounded-lg px-3 py-2.5 text-sm",
										"transition-colors hover:bg-accent hover:text-accent-foreground",
									)}
								>
									<span className="truncate font-medium">{s.name}</span>
									<ArrowRightIcon
										size={14}
										className="ml-2 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
									/>
								</Link>
							</li>
						))}
					</ul>
				</section>
			)}

			{/* Feature grid */}
			<section>
				<h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					Workspace
				</h2>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
					{QUICK_LINKS.map(({ to, label, description, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							className={cn(
								"flex flex-col gap-2 rounded-xl border p-4",
								"transition-colors hover:bg-accent hover:text-accent-foreground",
							)}
						>
							<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
								<Icon size={16} className="text-primary" />
							</div>
							<div>
								<p className="text-sm font-medium">{label}</p>
								<p className="text-xs text-muted-foreground">{description}</p>
							</div>
						</Link>
					))}
				</div>
			</section>
		</div>
	);
}
