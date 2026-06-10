import { createFileRoute } from "@tanstack/react-router";
import { ResearchPage } from "#/features/research/components/ResearchPage";

export const Route = createFileRoute("/_authenticated/research")({
	component: ResearchPage,
});
