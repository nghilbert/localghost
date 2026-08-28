import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "#/shared/components/ui/sidebar";
import { toolAvailabilityQueryOptions } from "#/shared/domain/chat/tools.functions";
import { AppSidebar } from "./_authenticated/-components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		if (!context.auth) throw redirect({ to: "/sign-in" });
		return { auth: context.auth };
	},
	// Warm the cache so the chat surfaces can seed their default toggles synchronously.
	loader: async ({ context }) => {
		await context.queryClient.query({ ...toolAvailabilityQueryOptions(), staleTime: "static" });
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
