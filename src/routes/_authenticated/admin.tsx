import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/PageHeader";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { adminQueryOptions } from "#/features/admin/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
	component: AdminPage,
});

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
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{(
							[
								["Users", users.length],
								["Chat sessions", stats.sessions],
								["Messages", stats.messages],
								["Memories", stats.memories],
								["Notes", stats.notes],
								["Active webhooks", stats.webhooks],
							] as [string, number][]
						).map(([label, val]) => (
							<Card key={label}>
								<CardContent className="text-center">
									<div className="text-2xl font-semibold">{val}</div>
									<div className="text-xs text-muted-foreground">{label}</div>
								</CardContent>
							</Card>
						))}
					</div>

					<Card>
						<CardHeader className="border-b">
							<CardTitle>Users</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<ul className="divide-y">
								{users.map((u) => (
									<li key={u.id} className="flex items-center gap-3 px-4 py-3">
										<Avatar className="h-8 w-8 shrink-0">
											<AvatarFallback className="text-xs">
												{u.name.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium">{u.name}</div>
											<div className="truncate text-xs text-muted-foreground">{u.email}</div>
										</div>
										<div className="flex shrink-0 gap-4 text-xs text-muted-foreground">
											<span>{u._count.chatSessions} sessions</span>
											<span>{u._count.memories} memories</span>
										</div>
										<div className="shrink-0 text-xs text-muted-foreground">
											{new Date(u.createdAt).toLocaleDateString()}
										</div>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
