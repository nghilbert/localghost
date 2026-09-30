import { useState } from "react";
import { Field } from "#/components/ui/field";
import { Select } from "#/components/ui/select";
import { PROVIDERS, type ProviderId } from "#/features/endpoint/lib/providers";
import { AddProviderForm } from "./AddProviderForm";

type ProviderSetupFormProps = {
	onCreated?: () => void;
};

function isProviderId(value: string): value is ProviderId {
	return PROVIDERS.some((provider) => provider.id === value);
}

const PROVIDER_ITEMS = PROVIDERS.map((provider) => ({ value: provider.id, label: provider.label }));

/** Adds an endpoint: pick a provider, then fill in only the fields it needs. */
export function ProviderSetupForm({ onCreated }: ProviderSetupFormProps) {
	const [providerId, setProviderId] = useState<ProviderId>("anthropic");
	const definition = PROVIDERS.find((provider) => provider.id === providerId);
	if (!definition) return null;

	return (
		<div className="space-y-4">
			<Field.Root>
				<Field.Label>Provider</Field.Label>
				<Select.Root
					items={PROVIDER_ITEMS}
					value={providerId}
					onValueChange={(value) => {
						if (value && isProviderId(value)) setProviderId(value);
					}}
				>
					<Select.Trigger>
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{PROVIDER_ITEMS.map((item) => (
							<Select.Item key={item.value} value={item.value}>
								{item.label}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
				<Field.Description>{definition.description}</Field.Description>
			</Field.Root>
			<AddProviderForm key={definition.id} definition={definition} onCreated={onCreated} />
		</div>
	);
}
