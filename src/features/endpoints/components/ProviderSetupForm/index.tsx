import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { AddProviderForm } from "#/features/endpoints/components/ProviderSetupForm/AddProviderForm";
import { PROVIDERS, type ProviderId } from "#/features/endpoints/lib/providers";

type ProviderSetupFormProps = {
	onCreated?: () => void;
};

function isProviderId(value: string): value is ProviderId {
	return PROVIDERS.some((provider) => provider.id === value);
}

/**
 * Guided provider setup: pick a provider from the dropdown, then fill in only
 * the fields that provider actually needs. Defaults to local Ollama.
 */
export function ProviderSetupForm({ onCreated }: ProviderSetupFormProps) {
	const [providerId, setProviderId] = useState<ProviderId>("ollama");
	const definition = PROVIDERS.find((provider) => provider.id === providerId);
	if (!definition) return null;

	return (
		<div className="space-y-4">
			<Field>
				<FieldLabel htmlFor="provider-select">Provider</FieldLabel>
				<Select
					value={providerId}
					onValueChange={(value) => {
						if (isProviderId(value)) setProviderId(value);
					}}
				>
					<SelectTrigger id="provider-select">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PROVIDERS.map((provider) => (
							<SelectItem key={provider.id} value={provider.id}>
								{provider.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<FieldDescription>{definition.description}</FieldDescription>
			</Field>
			<AddProviderForm key={definition.id} definition={definition} onCreated={onCreated} />
		</div>
	);
}
