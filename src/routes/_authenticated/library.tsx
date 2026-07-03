import { createFileRoute } from "@tanstack/react-router";
import { LibraryPage } from "#/features/library/components/LibraryPage";

export const Route = createFileRoute("/_authenticated/library")({
	head: () => ({ meta: [{ title: "Library · localghost" }] }),
	component: LibraryPage,
});
