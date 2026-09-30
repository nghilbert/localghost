import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ModelSettingsTab } from "#/features/library/components/ModelSettingsTab";

const modelsSearchSchema = z.object({
	endpointId: z.uuid().optional().catch(undefined),
	model: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/settings/models")({
	validateSearch: modelsSearchSchema,
	component: ModelsSettings,
});

function ModelsSettings() {
	const { endpointId, model } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<ModelSettingsTab
			selection={endpointId && model ? { endpointId, model } : undefined}
			onSelectionChange={(selection) => navigate({ search: selection, replace: true })}
		/>
	);
}
