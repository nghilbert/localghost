import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "#/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context }) => {
		if (!context.auth) throw redirect({ to: "/sign-in" });
		return { auth: context.auth };
	},
	component: () => (
		<SidebarProvider>
			<AppSidebar />
			{/* SidebarInset renders a <main /> element */}
			<SidebarInset className="flex container m-auto justify-center">
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	),
});
