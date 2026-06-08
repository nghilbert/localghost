import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "#/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		if (!context.auth) throw redirect({ to: "/sign-in" });
		return { auth: context.auth };
	},
	component: () => (
		<SidebarProvider className="bg-background">
			<AppSidebar />
			{/* SidebarInset renders a <main /> element */}
			<SidebarInset className="flex container justify-center">
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	),
});
