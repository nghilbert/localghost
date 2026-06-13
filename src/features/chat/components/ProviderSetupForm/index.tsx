import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "#/components/ui/item";
import { ProviderFields } from "#/features/chat/components/ProviderSetupForm/ProviderFields";
import { ProviderPicker } from "#/features/chat/components/ProviderSetupForm/ProviderPicker";
import { PROVIDERS, type ProviderId } from "#/features/chat/lib/providers";

type ProviderSetupFormProps = {
	onCreated?: () => void;
};

/**
 * Guided two-stage provider setup: pick a provider, then fill in only the
 * fields that provider actually needs.
 */
export function ProviderSetupForm({ onCreated }: ProviderSetupFormProps) {
	const [providerId, setProviderId] = useState<ProviderId | null>(null);
	const definition = PROVIDERS.find((provider) => provider.id === providerId);

	if (!definition) return <ProviderPicker onSelect={setProviderId} />;

	return (
		<div className="space-y-4">
			<Item variant="outline">
				<ItemContent>
					<ItemTitle>{definition.label}</ItemTitle>
					<ItemDescription>{definition.description}</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button variant="ghost" size="sm" onClick={() => setProviderId(null)}>
						Change
					</Button>
				</ItemActions>
			</Item>
			<ProviderFields key={definition.id} definition={definition} onCreated={onCreated} />
		</div>
	);
}
