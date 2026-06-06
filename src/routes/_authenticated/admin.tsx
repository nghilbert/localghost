import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { PageHeader } from "#/components/PageHeader";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

export const Route = createFileRoute("/_authenticated/admin")({
	component: AdminPage,
});

async function isAdmin(userId: string): Promise<boolean> {
	const adminEmail = process.env.ADMIN_EMAIL;
	if (adminEmail) {
		const user = await prisma.user.findFirst({ where: { id: userId }, select: { email: true } });
		return user?.email === adminEmail;
	}
	// Fall back to first registered user when ADMIN_EMAIL is not set
	const first = await prisma.user.findFirst({
		orderBy: { createdAt: "asc" },
		select: { id: true },
	});
	return first?.id === userId;
}

const getAdminStats = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");

	if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");

	const [users, sessions, messages, memories, documents, notes, contacts, webhooks] =
		await Promise.all([
			prisma.user.findMany({
				select: {
					id: true,
					name: true,
					email: true,
					createdAt: true,
					_count: {
						select: { chatSessions: true, memories: true, documents: true },
					},
				},
				orderBy: { createdAt: "asc" },
			}),
			prisma.chatSession.count(),
			prisma.chatMessage.count(),
			prisma.memory.count(),
			prisma.document.count(),
			prisma.note.count(),
			prisma.contact.count(),
			prisma.webhook.count({ where: { isActive: true } }),
		]);

	return {
		users,
		stats: { sessions, messages, memories, documents, notes, contacts, webhooks },
	};
});

const adminQueryOptions = () =>
	queryOptions({ queryKey: ["admin"], queryFn: () => getAdminStats() });

function AdminPage() {
	const { data, isError } = useQuery(adminQueryOptions());

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-sm text-muted-foreground">Access denied</p>
			</div>
		);
	}

	if (!data) return null;

	const { users, stats } = data;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader title="Admin" description="System stats and user management." />
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-3xl space-y-6 p-6">
					{/* System stats */}
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{(
							[
								["Users", users.length],
								["Chat sessions", stats.sessions],
								["Messages", stats.messages],
								["Memories", stats.memories],
								["Documents", stats.documents],
								["Notes", stats.notes],
								["Contacts", stats.contacts],
								["Active webhooks", stats.webhooks],
							] as [string, number][]
						).map(([label, val]) => (
							<div key={label} className="rounded-lg border p-4 text-center">
								<div className="text-2xl font-semibold">{val}</div>
								<div className="text-xs text-muted-foreground">{label}</div>
							</div>
						))}
					</div>

					{/* User list */}
					<div className="rounded-lg border">
						<div className="border-b px-4 py-2">
							<h2 className="text-sm font-medium">Users</h2>
						</div>
						<ul className="divide-y">
							{users.map((u) => (
								<li key={u.id} className="flex items-center gap-3 px-4 py-3">
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
										{u.name.slice(0, 2).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium truncate">{u.name}</div>
										<div className="text-xs text-muted-foreground truncate">{u.email}</div>
									</div>
									<div className="flex gap-4 shrink-0 text-xs text-muted-foreground">
										<span>{u._count.chatSessions} sessions</span>
										<span>{u._count.memories} memories</span>
										<span>{u._count.documents} docs</span>
									</div>
									<div className="text-xs text-muted-foreground shrink-0">
										{new Date(u.createdAt).toLocaleDateString()}
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}
