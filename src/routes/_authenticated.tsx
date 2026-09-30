import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "#/components/ui/sidebar";
import { chatQueries } from "#/features/chat/chat.queries";
import { AppSidebar } from "./_authenticated/-components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		if (!context.auth) throw redirect({ to: "/sign-in" });
		return { auth: context.auth };
	},
	// Loaded up front so chat pages know the default tools on first render.
	loader: async ({ context }) => {
		await context.queryClient.query({ ...chatQueries.toolAvailability(), staleTime: "static" });
	},
	component: () => (
		<Sidebar.Provider>
			<AppSidebar />

			<Sidebar.Inset>
				<MobileSidebarTrigger />
				<Outlet />
			</Sidebar.Inset>
		</Sidebar.Provider>
	),
});

/** On a narrow screen the sidebar is a closed sheet, so the page needs its own way to open it. */
function MobileSidebarTrigger() {
	const { isMobile } = Sidebar.useSidebar();
	if (!isMobile) return null;

	return <Sidebar.Trigger size="lg" className="m-2" />;
}
