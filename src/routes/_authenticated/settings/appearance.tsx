import { createFileRoute } from "@tanstack/react-router";
import { AppearanceTab } from "./-components/AppearanceTab";

export const Route = createFileRoute("/_authenticated/settings/appearance")({
	component: AppearanceTab,
});
