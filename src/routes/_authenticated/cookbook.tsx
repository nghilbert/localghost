import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { CookbookPage } from "#/features/cookbook/components/CookbookPage";

const cookbookSearchSchema = z.object({
	tab: z.enum(["my-models", "browse", "compare"]).optional(),
});

export const Route = createFileRoute("/_authenticated/cookbook")({
	component: CookbookPage,
	validateSearch: (search) => cookbookSearchSchema.parse(search),
});
