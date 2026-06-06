import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "#/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context }) => {
		if (!context.auth) throw redirect({ to: "/sign-in" });
		return { auth: context.auth };
	},
	component: () => (
		<SidebarProvider className="h-full">
			<AppSidebar />
			{/* SidebarInset renders a <main /> element */}
			<SidebarInset className="flex min-h-0 min-w-0 flex-col overflow-hidden">
				{/* Mobile-only top bar with sidebar trigger */}
				<div className="flex h-10 shrink-0 items-center border-b px-3 md:hidden">
					<SidebarTrigger />
				</div>
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	),
});
