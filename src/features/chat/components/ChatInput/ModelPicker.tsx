import { Link } from "@tanstack/react-router";
import { CheckIcon, ChevronDownIcon, LibraryIcon, TriangleAlertIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { cn } from "tailwind-variants";
import { Button } from "#/components/ui/button";
import { Menu } from "#/components/ui/menu";
import { Spinner } from "#/components/ui/spinner";
import { useEndpointModelGroups } from "#/features/library/hooks/use-endpoint-model-groups";
import type { ModelSelection } from "#/lib/llm-schemas";

type ModelPickerProps = {
	selection: ModelSelection | null;
	onSelect?: (selection: ModelSelection) => void;
};

/** Picks the endpoint and model for a new chat. */
export function ModelPicker({ selection, onSelect }: ModelPickerProps) {
	const [open, setOpen] = useState(false);
	const label = selection?.model ?? "Select model";
	const { groups, isLoading, isError } = useEndpointModelGroups(open);

	return (
		<Menu.Root open={open} onOpenChange={setOpen}>
			<Menu.Trigger
				render={(props, state) => (
					<Button
						{...props}
						color="neutral"
						variant="outlined"
						size="sm"
						className={cn("gap-1 truncate", !selection && "text-primary ring-2 ring-primary/40")}
					>
						<span className="truncate">{label}</span>
						{isLoading ? (
							<Spinner />
						) : (
							<ChevronDownIcon className={cn("transition-transform", state.open && "rotate-180")} />
						)}
					</Button>
				)}
			/>
			<Menu.Content hidden={isLoading} align="start" className="w-64">
				{isError ? (
					<Menu.Group>
						<Menu.GroupLabel>Couldn't reach endpoint</Menu.GroupLabel>
						<Menu.LinkItem render={<Link to="/settings/endpoints" />}>
							<TriangleAlertIcon />
							Check provider endpoints
						</Menu.LinkItem>
					</Menu.Group>
				) : groups.length === 0 ? (
					<Menu.Group>
						<Menu.GroupLabel>No models yet</Menu.GroupLabel>
						<Menu.LinkItem render={<Link to="/library" />}>
							<LibraryIcon />
							Browse the Library
						</Menu.LinkItem>
					</Menu.Group>
				) : (
					groups.map(({ endpoint, models }, i) => (
						<Fragment key={endpoint.id}>
							{i > 0 && <Menu.Separator />}
							<Menu.Group>
								<Menu.GroupLabel>{endpoint.name}</Menu.GroupLabel>
								{models.map((model) => {
									const isSelected =
										selection?.endpointId === endpoint.id && selection?.model === model;
									return (
										<Menu.Item
											key={model}
											onClick={() => onSelect?.({ endpointId: endpoint.id, model })}
										>
											<span className="truncate">{model}</span>
											{isSelected && <CheckIcon className="ml-auto size-3.5 shrink-0" />}
										</Menu.Item>
									);
								})}
							</Menu.Group>
						</Fragment>
					))
				)}
			</Menu.Content>
		</Menu.Root>
	);
}
