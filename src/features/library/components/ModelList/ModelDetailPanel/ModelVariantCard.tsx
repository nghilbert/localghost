import { CheckCircle2Icon } from "lucide-react";

import type { ComboboxFieldGroup } from "#/components/form/fields/ComboboxField";
import { useAppForm } from "#/components/form/use-app-form";
import { Badge } from "#/components/ui/badge";
import { Card } from "#/components/ui/card";
import { ModelPullControls } from "#/features/library/components/ModelPullControls";
import {
	buildModelAuthors,
	buildModelVariants,
	defaultOptionForAuthor,
	formatModelVariantDetails,
	groupModelVariantOptions,
	type ModelVariantGroupId,
	type ModelVariantOption,
	optionsForAuthor,
} from "#/features/library/lib/model-variants";
import type {
	CatalogModel,
	HardwareInfo,
	ModelVariantInfo,
	PullProgress,
} from "#/features/library/library.types";

/** The color of each fit group's label. The background stays opaque, since the label is sticky. */
const GROUP_LABEL_STYLE: Record<ModelVariantGroupId, string> = {
	fits: "border-l-2 border-success text-success",
	tight: "border-l-2 border-warning text-warning",
	"wont-fit": "border-l-2 border-danger text-danger",
	unknown: "text-muted-fg",
	variants: "text-muted-fg",
};

type ModelVariantCardProps = {
	catalog: CatalogModel | null;
	fallbackModelId: string;
	fallbackPullState: PullProgress | undefined;
	hardware: HardwareInfo | undefined;
	pulling: Record<string, PullProgress>;
	/** Every quant from all of the model's repos, once loaded. Until then `catalog.variants` is used. */
	fetchedVariants: ModelVariantInfo[] | undefined;
	/** The installed quant, which shows "Installed" instead of a download button. */
	installedModelId: string | null;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	className?: string;
};

function VariantOptionBody({
	option,
	installedModelId,
}: {
	option: ModelVariantOption;
	installedModelId: string | null;
}) {
	return (
		<span className="min-w-0 flex-1">
			<span className="flex items-center gap-1.5">
				<span className="block truncate font-medium">{option.quant}</span>
				{option.modelId === installedModelId && (
					<Badge className="shrink-0">
						<CheckCircle2Icon />
						Installed
					</Badge>
				)}
			</span>
			<span className="block truncate text-xs text-muted-fg">
				{formatModelVariantDetails(option)}
			</span>
		</span>
	);
}

/** Picks a model's quant and downloads it. */
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
	const variants = catalog
		? buildModelVariants({ catalog, hardware, variants: fetchedVariants })
		: null;
	const options = variants?.options ?? [];
	const { authors, defaultAuthor } = buildModelAuthors({
		options,
		primaryRepoId: catalog?.name ?? "",
		siblingRepoIds: catalog?.siblingRepoIds ?? [],
	});
	const defaultVariant =
		defaultOptionForAuthor({ options, author: defaultAuthor })?.modelId ??
		variants?.initialModelId ??
		fallbackModelId;

	const form = useAppForm({ defaultValues: { author: defaultAuthor, variant: defaultVariant } });

	return (
		<Card.Root size="sm" className={className}>
			<Card.Header>
				<Card.Title>{installedModelId ? "Variants" : "Download a variant"}</Card.Title>
				<Card.Description>
					{installedModelId
						? "Other quantizations of this model, including from other publishers."
						: "Choose a publisher and quantization, then download it to this machine."}
				</Card.Description>
			</Card.Header>
			<Card.Content className="space-y-2">
				<form.AppForm>
					<form.Subscribe selector={(state) => state.values}>
						{(values) => {
							const authorOptions = optionsForAuthor({ options, author: values.author });
							const variantGroups: ComboboxFieldGroup<ModelVariantOption>[] =
								groupModelVariantOptions({ options: authorOptions, hardware }).map((group) => ({
									id: group.id,
									label: group.label,
									labelClassName: GROUP_LABEL_STYLE[group.id],
									items: group.options,
								}));
							const selectedOption =
								options.find((option) => option.modelId === values.variant) ?? options[0];
							const targetModel = selectedOption?.modelId ?? fallbackModelId;
							const isTargetInstalled =
								installedModelId !== null && targetModel === installedModelId;
							const pullState =
								pulling[targetModel] ??
								(selectedOption?.isCurrent !== false ? fallbackPullState : undefined);

							return (
								<>
									{(authors.length > 1 || authorOptions.length > 1) && (
										<div className="grid gap-3 sm:grid-cols-2">
											{authors.length > 1 && (
												<form.AppField
													name="author"
													listeners={{
														onChange: ({ value }) => {
															const next = defaultOptionForAuthor({
																options,
																author: value,
															})?.modelId;
															if (next) form.setFieldValue("variant", next);
														},
													}}
												>
													{(field) => (
														<field.ComboboxField
															label="Publisher"
															fieldOrientation="vertical"
															items={authors}
															itemToValue={(author) => author.name}
															itemToLabel={(author) => author.name}
															placeholder="Search publishers..."
															emptyMessage="No matching publishers."
														/>
													)}
												</form.AppField>
											)}
											{authorOptions.length > 1 && (
												<form.AppField name="variant">
													{(field) => (
														<field.ComboboxField
															label="Variant"
															fieldOrientation="vertical"
															groups={variantGroups}
															itemToValue={(option) => option.modelId}
															itemToLabel={(option) => option.quant}
															renderItem={(option) => (
																<VariantOptionBody
																	option={option}
																	installedModelId={installedModelId}
																/>
															)}
															placeholder="Search variants..."
															emptyMessage="No matching variants."
														/>
													)}
												</form.AppField>
											)}
										</div>
									)}

									<div className="flex flex-wrap items-center justify-between gap-2">
										<p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-fg">
											<span className="font-medium text-fg">{targetModel}</span>
											{selectedOption && ` · ${formatModelVariantDetails(selectedOption)}`}
										</p>
										{isTargetInstalled ? (
											<Badge>
												<CheckCircle2Icon />
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
									{isTargetInstalled && (
										<p className="text-xs text-muted-fg">
											This quantization is installed. Pick another to add it alongside.
										</p>
									)}
									{selectedOption?.fit === "wont-fit" && (
										<p className="text-xs text-danger">Won't fit on this machine's memory.</p>
									)}
								</>
							);
						}}
					</form.Subscribe>
				</form.AppForm>
			</Card.Content>
		</Card.Root>
	);
}
