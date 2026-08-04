import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_chat")({
	component: ChatLayout,
});

/** Provides the shared route geometry for every chat surface. */
function ChatLayout() {
	return (
		<div className="mx-auto grid w-full min-h-0 max-w-4xl flex-1">
			<Outlet />
		</div>
	);
}
