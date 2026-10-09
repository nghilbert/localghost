import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Library } from "#/features/library/components/Library";
import { DEFAULT_CATALOG_QUERY } from "#/features/library/hooks/use-model-list";
import { libraryQueries } from "#/features/library/library.queries";

export const Route = createFileRoute("/_authenticated/library")({
	// Not awaited, so the page shows skeletons while these load.
	loader: ({ context }) => {
		void context.queryClient.query(libraryQueries.hardware()).catch(noop);
		void context.queryClient.query(libraryQueries.runtimeStatus()).catch(noop);
		void context.queryClient.query(libraryQueries.catalog(DEFAULT_CATALOG_QUERY)).catch(noop);
	},
	head: () => ({ meta: [{ title: "Library · localghost" }] }),
	component: Library,
});
