import { useId, useState } from "react";
import { ModelPullControls } from "#/routes/_authenticated/library/-components/ModelPullControls";
import {
	buildModelVariants,
	formatModelVariantDetails,
	type ModelVariantGroup,
	type ModelVariantOption,
} from "#/routes/_authenticated/library/-lib/model-variants";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
} from "#/shared/components/ui/combobox";
import { Field, FieldLabel } from "#/shared/components/ui/field";
import type { CatalogModel, HardwareInfo, PullProgress } from "#/shared/domain/model/types";
import { cn } from "#/shared/lib/utils";

type VariantComboboxGroup = Omit<ModelVariantGroup, "options"> & {
	items: ModelVariantOption[];
};

type ModelVariantCardProps = {
	catalog: CatalogModel | null;
	fallbackModelId: string;
	fallbackPullState: PullProgress | undefined;
	hardware: HardwareInfo | undefined;
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
};

/** Variant selection and pull controls for an available catalog row. */
export function ModelVariantCard({
	catalog,
	fallbackModelId,
	fallbackPullState,
	hardware,
	pulling,
	onPull,
	onStop,
}: ModelVariantCardProps) {
	const fieldId = useId();
	const variants = catalog ? buildModelVariants({ catalog, hardware }) : null;
	const [selectedQuant, setSelectedQuant] = useState(() => variants?.initialQuant);
	const selectedOption =
		variants?.options.find((option) => option.quant === selectedQuant) ?? variants?.options[0];
	const targetModel = selectedOption?.modelId ?? fallbackModelId;
	const pullState =
		pulling[targetModel] ?? (selectedOption?.isCurrent !== false ? fallbackPullState : undefined);
	const groups: VariantComboboxGroup[] =
		variants?.groups.map(({ options, ...group }) => ({ ...group, items: options })) ?? [];

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>Pull a variant</CardTitle>
				<CardDescription>Choose a quantization, then download it to this machine.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className={cn("flex gap-2", pullState ? "flex-col" : "items-end")}>
					{variants && variants.options.length > 1 && selectedOption && (
						<Field className="flex-1">
							<FieldLabel htmlFor={fieldId}>Variant</FieldLabel>
							<Combobox<ModelVariantOption>
								items={groups}
								value={selectedOption}
								onValueChange={(option) => {
									if (option) setSelectedQuant(option.quant);
								}}
								itemToStringLabel={(option) => option.quant}
								itemToStringValue={(option) => option.quant}
								isItemEqualToValue={(option, value) => option.quant === value.quant}
							>
								<ComboboxInput
									id={fieldId}
									className="w-full"
									placeholder="Search variants…"
									data-testid="model-variant-combobox"
								/>
								<ComboboxContent>
									<ComboboxEmpty>No matching variants.</ComboboxEmpty>
									<ComboboxList>
										{(group: VariantComboboxGroup) => (
											<ComboboxGroup key={group.id} items={group.items}>
												<ComboboxLabel>{group.label}</ComboboxLabel>
												<ComboboxCollection>
													{(option: ModelVariantOption) => (
														<ComboboxItem
															key={option.quant}
															value={option}
															data-testid="model-variant-option"
														>
															<span className="min-w-0 flex-1">
																<span className="block truncate font-medium">{option.quant}</span>
																<span className="block truncate text-xs text-muted-foreground">
																	{formatModelVariantDetails(option)}
																</span>
															</span>
														</ComboboxItem>
													)}
												</ComboboxCollection>
											</ComboboxGroup>
										)}
									</ComboboxList>
								</ComboboxContent>
							</Combobox>
						</Field>
					)}
					<ModelPullControls
						modelId={targetModel}
						pullState={pullState}
						onPull={onPull}
						onStop={onStop}
					/>
				</div>

				<p className="text-xs text-muted-foreground" data-testid="model-variant-target">
					<span className="font-medium text-foreground">{targetModel}</span>
					{selectedOption && ` · ${formatModelVariantDetails(selectedOption)}`}
				</p>
				{selectedOption?.fit === "may-be-too-large" && (
					<p className="text-xs text-destructive">Likely too large for this machine's memory.</p>
				)}
			</CardContent>
		</Card>
	);
}
