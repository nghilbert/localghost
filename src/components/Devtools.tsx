import { lazy, Suspense } from "react";

/**
 * Dev-only TanStack devtools panel (Query + Router). Lazily imported behind an
 * `import.meta.env.DEV` guard so the devtools packages are never bundled into the
 * production build.
 */
const DevtoolsPanel = lazy(async () => {
	const [{ TanStackDevtools }, { ReactQueryDevtoolsPanel }, { TanStackRouterDevtoolsPanel }] =
		await Promise.all([
			import("@tanstack/react-devtools"),
			import("@tanstack/react-query-devtools"),
			import("@tanstack/react-router-devtools"),
		]);

	return {
		default: () => (
			<TanStackDevtools
				plugins={[
					{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
					{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
				]}
			/>
		),
	};
});

export function Devtools() {
	if (!import.meta.env.DEV) return null;
	return (
		<Suspense fallback={null}>
			<DevtoolsPanel />
		</Suspense>
	);
}
