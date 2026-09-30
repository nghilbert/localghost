import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { SettingsSection } from "#/components/layout/SettingsSection";
import { StatusBadge } from "#/components/layout/StatusBadge";
import { RuntimeConnectionForm } from "#/features/library/components/RuntimeConnectionForm";
import { libraryQueries } from "#/features/library/library.queries";
import { LLAMACPP_SETTINGS_ID } from "./LlamacppSettingsLink";

const DEFAULT_RUNTIME_URL = "http://localhost:8080";

/** The llama.cpp connection status, with a form to change its URL. */
export function LlamacppSettings() {
	const { data: status } = useQuery(libraryQueries.runtimeStatus());
	const currentUrl = status?.runtimeUrl ?? DEFAULT_RUNTIME_URL;

	return (
		<SettingsSection
			id={LLAMACPP_SETTINGS_ID}
			title={
				<>
					llama.cpp
					{status?.found ? (
						<StatusBadge tone="success">
							<CheckCircle2Icon />
							Connected
						</StatusBadge>
					) : (
						<StatusBadge tone="warning">
							<CircleAlertIcon />
							Not found
						</StatusBadge>
					)}
				</>
			}
			description="Found automatically when llama-server runs on this machine. To use another host or port, such as a homelab server, enter its URL below; llama-server must listen on the network there (--host 0.0.0.0)."
		>
			<RuntimeConnectionForm key={currentUrl} defaultUrl={currentUrl} submitLabel="Save" />
		</SettingsSection>
	);
}
