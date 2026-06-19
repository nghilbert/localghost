import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { LibraryPage } from "#/features/library/components/LibraryPage";

const librarySearchSchema = z.object({
	tab: z.enum(["my-models", "browse"]).optional(),
});

export const Route = createFileRoute("/_authenticated/library")({
	component: LibraryPage,
	validateSearch: (search) => librarySearchSchema.parse(search),
});
