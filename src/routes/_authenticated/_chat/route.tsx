import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Container } from "#/shared/components/ui/container";

export const Route = createFileRoute("/_authenticated/_chat")({
	component: () => (
		<Container size="4xl" className="grid min-h-0 flex-1">
			<Outlet />
		</Container>
	),
});
