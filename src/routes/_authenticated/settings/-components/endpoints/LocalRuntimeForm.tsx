import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { Badge } from "#/shared/components/ui/badge";
import { FieldDescription, FieldLegend, FieldSet } from "#/shared/components/ui/field";
import { libraryStatusQueryOptions } from "#/shared/domain/model/model.functions";
import { RuntimeConnectionForm } from "#/shared/domain/model/RuntimeConnectionForm";

const DEFAULT_RUNTIME_URL = "http://localhost:8080";

/** Shows the built-in llama.cpp status and lets Settings change its URL. */
export function LocalRuntimeForm() {
	const { data: status } = useQuery(libraryStatusQueryOptions());
	const currentUrl = status?.runtimeUrl ?? DEFAULT_RUNTIME_URL;

	return (
		<FieldSet>
			<FieldLegend className="flex items-center gap-2">
				Local llama.cpp
				{status?.found ? (
					<Badge variant="secondary" className="bg-success/10 text-success">
						<CheckCircle2Icon />
						{status.installedModels.length} models
					</Badge>
				) : (
					<Badge variant="secondary" className="bg-warning/10 text-warning">
						<CircleAlertIcon />
						Not found
					</Badge>
				)}
			</FieldLegend>
			<FieldDescription>
				Built in, no setup needed when llama-server runs locally. Point it at another host or port
				below (e.g. a homelab server); llama-server must listen on the network there (--host
				0.0.0.0).
			</FieldDescription>
			<RuntimeConnectionForm key={currentUrl} defaultUrl={currentUrl} submitLabel="Save" />
		</FieldSet>
	);
}
