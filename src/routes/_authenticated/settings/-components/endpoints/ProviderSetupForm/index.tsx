import { useState } from "react";
import { PROVIDERS, type ProviderId } from "#/routes/_authenticated/settings/-lib/providers";
import { Field, FieldDescription, FieldLabel } from "#/shared/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/shared/components/ui/select";
import { AddProviderForm } from "./AddProviderForm";

type ProviderSetupFormProps = {
	onCreated?: () => void;
};

function isProviderId(value: string): value is ProviderId {
	return PROVIDERS.some((provider) => provider.id === value);
}

/**
 * Guided add-endpoint form: pick the provider (protocol) from the dropdown, then fill
 * in only the fields that provider actually needs. Local llama.cpp is built in, so the
 * picker lists only hosted and self-hosted providers.
 */
export function ProviderSetupForm({ onCreated }: ProviderSetupFormProps) {
	const [providerId, setProviderId] = useState<ProviderId>("anthropic");
	const definition = PROVIDERS.find((provider) => provider.id === providerId);
	if (!definition) return null;

	return (
		<div className="space-y-4">
			<Field>
				<FieldLabel htmlFor="provider-select">Provider</FieldLabel>
				<Select
					value={providerId}
					onValueChange={(value) => {
						if (value && isProviderId(value)) setProviderId(value);
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
