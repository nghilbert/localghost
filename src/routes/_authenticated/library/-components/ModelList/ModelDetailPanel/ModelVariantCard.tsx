import { CheckCircle2Icon } from "lucide-react";
import { useId, useState } from "react";
import { ModelPullControls } from "#/routes/_authenticated/library/-components/ModelPullControls";
import {
	buildModelVariants,
	formatModelVariantDetails,
	type ModelVariantGroup,
	type ModelVariantOption,
} from "#/routes/_authenticated/library/-lib/model-variants";
import { Badge } from "#/shared/components/ui/badge";
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
import type {
	CatalogModel,
	HardwareInfo,
	ModelVariantInfo,
	PullProgress,
} from "#/shared/domain/model/types";
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
	/** A lazily-fetched cross-publisher variant list; falls back to `catalog.variants` while loading. */
	fetchedVariants: ModelVariantInfo[] | undefined;
	/** The row's exact installed quant, so the matching option can show "Installed" instead of a pull control. */
	installedModelId: string | null;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	className?: string;
};

/** Variant selection for a catalog row: pull controls when uninstalled, an "Installed" badge for the current quant. */
export function ModelVariantCard({
	catalog,
	fallbackModelId,
	fallbackPullState,
	hardware,
	pulling,
	fetchedVariants,
	installedModelId,
	onPull,
	onStop,
	className,
}: ModelVariantCardProps) {
	const fieldId = useId();
	const variants = catalog
		? buildModelVariants({ catalog, hardware, variants: fetchedVariants })
		: null;
	const [selectedModelId, setSelectedModelId] = useState(() => variants?.initialModelId);
	const selectedOption =
		variants?.options.find((option) => option.modelId === selectedModelId) ?? variants?.options[0];
	const targetModel = selectedOption?.modelId ?? fallbackModelId;
	const isTargetInstalled = installedModelId !== null && targetModel === installedModelId;
	const pullState =
		pulling[targetModel] ?? (selectedOption?.isCurrent !== false ? fallbackPullState : undefined);
	const groups: VariantComboboxGroup[] =
		variants?.groups.map(({ options, ...group }) => ({ ...group, items: options })) ?? [];

	return (
		<Card size="sm" className={className}>
			<CardHeader>
				<CardTitle>{installedModelId ? "Variants" : "Pull a variant"}</CardTitle>
				<CardDescription>
					{installedModelId
						? "Other quantizations of this model, including from other publishers."
						: "Choose a quantization, then download it to this machine."}
				</CardDescription>
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
									if (option) setSelectedModelId(option.modelId);
								}}
								itemToStringLabel={(option) => option.quant}
								itemToStringValue={(option) => option.modelId}
								isItemEqualToValue={(option, value) => option.modelId === value.modelId}
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
															key={option.modelId}
															value={option}
															data-testid="model-variant-option"
														>
															<span className="min-w-0 flex-1">
																<span className="flex items-center gap-1.5">
																	<span className="block truncate font-medium">{option.quant}</span>
																	{option.modelId === installedModelId && (
																		<Badge variant="secondary" className="shrink-0">
																			<CheckCircle2Icon data-icon="inline-start" />
																			Installed
																		</Badge>
																	)}
																</span>
																<span className="block truncate text-xs text-muted-foreground">
																	{formatModelVariantDetails(option)}
																</span>
																{!option.isSameRepoAsPrimary && (
																	<span className="block truncate text-[11px] text-muted-foreground">
																		from {option.repoId}
																	</span>
																)}
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
					{isTargetInstalled ? (
						<Badge variant="secondary">
							<CheckCircle2Icon data-icon="inline-start" />
							Installed
						</Badge>
					) : (
						<ModelPullControls
							modelId={targetModel}
							pullState={pullState}
							onPull={onPull}
							onStop={onStop}
						/>
					)}
				</div>

				<p
					className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
					data-testid="model-variant-target"
				>
					<span className="font-medium text-foreground">{targetModel}</span>
					{selectedOption && ` · ${formatModelVariantDetails(selectedOption)}`}
					{selectedOption && !selectedOption.isSameRepoAsPrimary && (
						<Badge variant="outline">{selectedOption.repoId}</Badge>
					)}
				</p>
				{selectedOption?.fit === "may-be-too-large" && (
					<p className="text-xs text-destructive">Likely too large for this machine's memory.</p>
				)}
			</CardContent>
		</Card>
	);
}
