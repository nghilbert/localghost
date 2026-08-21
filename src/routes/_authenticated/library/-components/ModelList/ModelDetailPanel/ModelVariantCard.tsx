import { CheckCircle2Icon } from "lucide-react";
import { ModelPullControls } from "#/routes/_authenticated/library/-components/ModelPullControls";
import {
	buildModelAuthors,
	buildModelVariants,
	defaultOptionForAuthor,
	formatModelVariantDetails,
	groupModelVariantOptions,
	type ModelVariantGroupId,
	type ModelVariantOption,
	optionsForAuthor,
} from "#/routes/_authenticated/library/-lib/model-variants";
import { Badge } from "#/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import type {
	CatalogModel,
	HardwareInfo,
	ModelVariantInfo,
	PullProgress,
} from "#/shared/domain/model/types";
import { useAppForm } from "#/shared/hooks/use-app-form";
import type { ComboboxFieldGroup } from "#/shared/hooks/use-app-form/fields/ComboboxField";

/**
 * Sticky group-header accent, echoing each bucket's semantic meaning. Backgrounds stay
 * opaque (`bg-popover`, matching the popup) since a sticky header must fully occlude the
 * items scrolling beneath it; a translucent tint would let their text show through.
 */
const GROUP_LABEL_STYLE: Record<ModelVariantGroupId, string> = {
	"likely-fits": "border-l-2 border-success text-success",
	"may-be-too-large": "border-l-2 border-warning text-warning",
	"wont-fit": "border-l-2 border-destructive text-destructive",
	"size-unknown": "text-muted-foreground",
	variants: "text-muted-foreground",
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
					<Badge variant="secondary" className="shrink-0">
						<CheckCircle2Icon data-icon="inline-start" />
						Installed
					</Badge>
				)}
			</span>
			<span className="block truncate text-xs text-muted-foreground">
				{formatModelVariantDetails(option)}
			</span>
		</span>
	);
}

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
		<Card size="sm" className={className}>
			<CardHeader>
				<CardTitle>{installedModelId ? "Variants" : "Pull a variant"}</CardTitle>
				<CardDescription>
					{installedModelId
						? "Other quantizations of this model, including from other publishers."
						: "Choose a publisher and quantization, then download it to this machine."}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
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
															placeholder="Search publishers…"
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
															placeholder="Search variants…"
															emptyMessage="No matching variants."
														/>
													)}
												</form.AppField>
											)}
										</div>
									)}

									<div
										className={
											pullState
												? "flex flex-col gap-2"
												: "flex flex-wrap items-center justify-between gap-2"
										}
									>
										<p
											className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
											data-testid="model-variant-target"
										>
											<span className="font-medium text-foreground">{targetModel}</span>
											{selectedOption && ` · ${formatModelVariantDetails(selectedOption)}`}
										</p>
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
									{isTargetInstalled && (
										<p
											className="text-xs text-muted-foreground"
											data-testid="model-variant-installed-hint"
										>
											This quantization is installed. Pick another to add it alongside.
										</p>
									)}
									{selectedOption?.fit === "wont-fit" && (
										<p className="text-xs text-destructive">Won't fit on this machine's memory.</p>
									)}
								</>
							);
						}}
					</form.Subscribe>
				</form.AppForm>
			</CardContent>
		</Card>
	);
}
