import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { toolAvailabilityQueryOptions } from "#/features/send-message/lib/tools.functions";
import { SidebarInset, SidebarProvider } from "#/shared/ui/sidebar";
import { AppSidebar } from "./_authenticated/-components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		if (!context.auth) throw redirect({ to: "/sign-in" });
		return { auth: context.auth };
	},
	// Warm the cache so the chat surfaces can seed their default toggles synchronously.
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(toolAvailabilityQueryOptions());
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
