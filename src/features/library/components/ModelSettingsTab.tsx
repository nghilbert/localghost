import { useQuery } from "@tanstack/react-query";
import { SettingsSection } from "#/components/layout/SettingsSection";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Empty } from "#/components/ui/empty";
import { Item } from "#/components/ui/item";
import { Select } from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { useEndpointModelGroups } from "#/features/library/hooks/use-endpoint-model-groups";
import { useResetModelSetting } from "#/features/library/hooks/use-reset-model-setting";
import { libraryQueries } from "#/features/library/library.queries";
import type { ModelSelection } from "#/lib/llm-schemas";
import { ModelSettingsForm } from "./ModelSettingsForm";

type ModelSettingsTabProps = {
	/** The model being edited, if any. */
	selection: ModelSelection | undefined;
	onSelectionChange: (selection: ModelSelection) => void;
};

/** A unique key for one model on one endpoint. */
function selectionKey({ endpointId, model }: ModelSelection): string {
	return `${endpointId}/${model}`;
}

/** Settings > Models: pick a model to tune, and the models that already have overrides. */
export function ModelSettingsTab({ selection, onSelectionChange }: ModelSettingsTabProps) {
	const { groups, isLoading } = useEndpointModelGroups(true);
	const { data: settings, isPending } = useQuery(libraryQueries.modelSettings.list());
	const reset = useResetModelSetting();

	const options = groups.flatMap(({ endpoint, models }) =>
		models.map((model) => ({ endpointId: endpoint.id, endpointName: endpoint.name, model })),
	);
	const selected = selection
		? options.find((option) => selectionKey(option) === selectionKey(selection))
		: undefined;

	return (
		<>
			<SettingsSection
				title="Tune a model"
				description="Sampling overrides for one model. They win over the endpoint's options and your account's temperature."
			>
				<Select.Root
					items={options.map((option) => ({ value: selectionKey(option), label: option.model }))}
					value={selection ? selectionKey(selection) : null}
					onValueChange={(key: string | null) => {
						const option = options.find((candidate) => selectionKey(candidate) === key);
						if (option) onSelectionChange({ endpointId: option.endpointId, model: option.model });
					}}
				>
					<Select.Trigger aria-label="Model" disabled={isLoading}>
						<Select.Value placeholder={isLoading ? "Loading models..." : "Pick a model"} />
					</Select.Trigger>
					<Select.Content>
						{groups.map(({ endpoint, models }) => (
							<Select.Group key={endpoint.id}>
								<Select.GroupLabel>{endpoint.name}</Select.GroupLabel>
								{models.map((model) => (
									<Select.Item key={model} value={selectionKey({ endpointId: endpoint.id, model })}>
										{model}
									</Select.Item>
								))}
							</Select.Group>
						))}
					</Select.Content>
				</Select.Root>

				{selection && (
					<Card.Root size="sm">
						<Card.Header>
							<Card.Title>{selection.model}</Card.Title>
							{selected && <Card.Description>{selected.endpointName}</Card.Description>}
						</Card.Header>
						<Card.Content>
							<ModelSettingsForm
								key={selectionKey(selection)}
								endpointId={selection.endpointId}
								model={selection.model}
							/>
						</Card.Content>
					</Card.Root>
				)}
			</SettingsSection>

			<SettingsSection title="Models with overrides">
				{isPending ? (
					<Skeleton className="h-14 w-full" />
				) : !settings?.length ? (
					<Empty.Root>
						<Empty.Title>No overrides yet</Empty.Title>
						<Empty.Description>
							Every model uses the endpoint and account defaults.
						</Empty.Description>
					</Empty.Root>
				) : (
					<Item.Group render={<ul />}>
						{settings.map((setting) => (
							<Item.Root key={selectionKey(setting)} render={<li />} variant="outlined">
								<Item.Content>
									<Item.Title>{setting.model}</Item.Title>
									<Item.Description>
										{setting.endpointName} · {describeOverrides(setting.options)}
									</Item.Description>
								</Item.Content>
								<Item.Actions>
									<Button
										color="neutral"
										variant="outlined"
										size="sm"
										onClick={() =>
											onSelectionChange({ endpointId: setting.endpointId, model: setting.model })
										}
									>
										Edit
									</Button>
									<Button
										color="danger"
										variant="quiet"
										size="sm"
										disabled={reset.isPending}
										onClick={() =>
											reset.mutate({ endpointId: setting.endpointId, model: setting.model })
										}
									>
										Reset
									</Button>
								</Item.Actions>
							</Item.Root>
						))}
					</Item.Group>
				)}
			</SettingsSection>
		</>
	);
}

/** The set overrides as "name value" pairs, e.g. "temperature 0.7 · top_p 0.9". */
function describeOverrides(options: Record<string, number | undefined>): string {
	const parts = Object.entries(options).flatMap(([name, value]) =>
		value === undefined ? [] : [`${name} ${value}`],
	);
	return parts.length > 0 ? parts.join(" · ") : "no values set";
}
