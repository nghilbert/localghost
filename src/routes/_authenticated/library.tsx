import { createFileRoute } from "@tanstack/react-router";
import { Library } from "#/features/library/components/Library";
import { DEFAULT_CATALOG_QUERY } from "#/features/library/hooks/use-model-list";
import { libraryQueries } from "#/features/library/library.queries";

export const Route = createFileRoute("/_authenticated/library")({
	head: () => ({ meta: [{ title: "Library · localghost" }] }),
	// Not awaited, so the page shows skeletons while these load.
	loader: ({ context }) => {
		const ignoreError = () => undefined;
		context.queryClient.query(libraryQueries.hardware()).catch(ignoreError);
		context.queryClient.query(libraryQueries.runtimeStatus()).catch(ignoreError);
		context.queryClient.query(libraryQueries.catalog(DEFAULT_CATALOG_QUERY)).catch(ignoreError);
	},
	component: Library,
});
