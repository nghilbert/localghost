import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "#/components/ui/field";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { PROVIDERS, type ProviderId } from "#/features/chat/lib/providers";

type ProviderPickerProps = {
	onSelect: (id: ProviderId) => void;
};

function isProviderId(value: string): value is ProviderId {
	return PROVIDERS.some((provider) => provider.id === value);
}

export function ProviderPicker({ onSelect }: ProviderPickerProps) {
	return (
		<RadioGroup
			value=""
			onValueChange={(value) => {
				if (isProviderId(value)) onSelect(value);
			}}
		>
			{PROVIDERS.map((provider) => (
				<FieldLabel key={provider.id} htmlFor={`provider-${provider.id}`}>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldTitle>{provider.label}</FieldTitle>
							<FieldDescription>{provider.description}</FieldDescription>
						</FieldContent>
						<RadioGroupItem value={provider.id} id={`provider-${provider.id}`} />
					</Field>
				</FieldLabel>
			))}
		</RadioGroup>
	);
}
