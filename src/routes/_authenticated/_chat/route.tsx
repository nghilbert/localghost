import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Page } from "#/components/layout/Page";

export const Route = createFileRoute("/_authenticated/_chat")({
	component: () => (
		<Page size="lg" spacing="none" className="grid min-h-0 flex-1">
			<Outlet />
		</Page>
	),
});
