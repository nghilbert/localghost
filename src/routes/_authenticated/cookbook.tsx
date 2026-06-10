import { createFileRoute } from "@tanstack/react-router";
import { CookbookPage } from "#/features/cookbook/components/CookbookPage";

export const Route = createFileRoute("/_authenticated/cookbook")({
	component: CookbookPage,
});
