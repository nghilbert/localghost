import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "#/shared/ui/sidebar";
import { AppSidebar } from "./_authenticated/-components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		if (!context.auth) throw redirect({ to: "/sign-in" });
		return { auth: context.auth };
	},
	component: () => (
		<SidebarProvider className="bg-background">
			<AppSidebar />
			{/* SidebarInset renders a <main /> element */}
			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	),
});
