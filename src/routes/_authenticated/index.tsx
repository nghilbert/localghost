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
	TimerIcon,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { createSession, sessionsQueryOptions } from "#/features/chat/lib/chat.functions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

const QUICK_LINKS = [
	{
		to: "/documents",
		label: "Documents",
		description: "Write and version your notes",
		icon: FileTextIcon,
		color: "text-blue-500",
		bg: "bg-blue-500/10",
	},
	{
		to: "/research",
		label: "Research",
		description: "Deep iterative web research",
		icon: SearchIcon,
		color: "text-violet-500",
		bg: "bg-violet-500/10",
	},
	{
		to: "/email",
		label: "Email",
		description: "Read and send email via IMAP",
		icon: MailIcon,
		color: "text-amber-500",
		bg: "bg-amber-500/10",
	},
	{
		to: "/calendar",
		label: "Calendar",
		description: "Events and CalDAV sync",
		icon: CalendarIcon,
		color: "text-green-500",
		bg: "bg-green-500/10",
	},
	{
		to: "/tasks",
		label: "Tasks",
		description: "Scheduled LLM prompts",
		icon: TimerIcon,
		color: "text-orange-500",
		bg: "bg-orange-500/10",
	},
	{
		to: "/compare",
		label: "Compare",
		description: "Side-by-side model outputs",
		icon: LayoutGridIcon,
		color: "text-rose-500",
		bg: "bg-rose-500/10",
	},
	{
		to: "/gallery",
		label: "Gallery",
		description: "Upload and browse images",
		icon: GalleryHorizontalIcon,
		color: "text-cyan-500",
		bg: "bg-cyan-500/10",
	},
] as const;

function HomePage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: sessions = [] } = useQuery(sessionsQueryOptions());
	const recentSessions = sessions.slice(0, 5);

	const createMut = useMutation({
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
					onClick={() => createMut.mutate()}
					disabled={createMut.isPending}
				>
					<MessageSquarePlusIcon size={16} />
					{createMut.isPending ? "Creating…" : "New chat"}
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
					{QUICK_LINKS.map(({ to, label, description, icon: Icon, color, bg }) => (
						<Link
							key={to}
							to={to}
							className={cn(
								"flex flex-col gap-2 rounded-xl border p-4",
								"transition-colors hover:bg-accent hover:text-accent-foreground",
							)}
						>
							<div className={cn("flex size-8 items-center justify-center rounded-lg", bg)}>
								<Icon size={16} className={color} />
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
