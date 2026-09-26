import { createFileRoute } from "@tanstack/react-router";
import { EndpointsTab } from "./-components/EndpointsTab";

export const Route = createFileRoute("/_authenticated/settings/endpoints")({
	component: EndpointsTab,
});
