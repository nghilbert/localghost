import { useId, useState } from "react";
import { ModelPullControls } from "#/features/pull-model/components/ModelPullControls";
import {
	buildModelVariants,
	formatModelVariantDetails,
	type ModelVariantGroup,
	type ModelVariantOption,
} from "#/features/pull-model/lib/model-variants";
import type { CatalogModel, HardwareInfo, PullProgress } from "#/features/pull-model/lib/types";
import { cn } from "#/shared/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/shared/ui/card";
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
} from "#/shared/ui/combobox";
import { Field, FieldLabel } from "#/shared/ui/field";

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
	onDismiss: (model: string) => void;
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
	onDismiss,
}: ModelVariantCardProps) {
	const fieldId = useId();
	const variants = catalog ? buildModelVariants({ catalog, hardware }) : null;
	const [selectedTag, setSelectedTag] = useState(() => variants?.initialTag);
	const selectedOption =
		variants?.options.find((option) => option.tag === selectedTag) ?? variants?.options[0];
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
									if (option) setSelectedTag(option.tag);
								}}
								itemToStringLabel={(option) => option.tag}
								itemToStringValue={(option) => option.tag}
								isItemEqualToValue={(option, value) => option.tag === value.tag}
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
															key={option.tag}
															value={option}
															data-testid="model-variant-option"
														>
															<span className="min-w-0 flex-1">
																<span className="block truncate font-medium">{option.tag}</span>
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
						onDismiss={onDismiss}
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
