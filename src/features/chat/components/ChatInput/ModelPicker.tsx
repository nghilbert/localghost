import { Link } from "@tanstack/react-router";
import { ChevronDownIcon, LibraryIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "tailwind-variants";
import { Button } from "#/components/ui/button";
import { ButtonLink } from "#/components/ui/button-link";
import { Combobox } from "#/components/ui/combobox";
import { Spinner } from "#/components/ui/spinner";
import type { ModelSelection } from "#/lib/llm-schemas";

/** An endpoint and the models it offers. */
export interface ModelGroup {
	endpoint: { id: string; name: string };
	models: string[];
}

/** What a chat passes to the model picker a route supplies. */
export interface ModelPickerSlotProps {
	selection: ModelSelection | null;
	onSelect?: (selection: ModelSelection) => void;
}

interface ModelPickerProps extends ModelPickerSlotProps {
	/** The caller fetches `groups` only while the list is open. */
	open: boolean;
	onOpenChange: (open: boolean) => void;
	groups: ModelGroup[];
	isLoading: boolean;
	isError: boolean;
}

/** A group as the combobox lists it, one selection per model. */
interface ModelItemGroup {
	endpoint: { id: string; name: string };
	items: ModelSelection[];
}

function isSameModel(a: ModelSelection, b: ModelSelection) {
	return a.endpointId === b.endpointId && a.model === b.model;
}

/** Picks the endpoint and model for a new chat, with a search over every endpoint's models. */
export function ModelPicker({
	selection,
	onSelect,
	open,
	onOpenChange,
	groups,
	isLoading,
	isError,
}: ModelPickerProps) {
	const items: ModelItemGroup[] = groups.map(({ endpoint, models }) => ({
		endpoint,
		items: models.map((model) => ({ endpointId: endpoint.id, model })),
	}));

	return (
		<Combobox.Root<ModelSelection>
			items={items}
			value={selection}
			onValueChange={(next) => {
				if (next) onSelect?.(next);
			}}
			open={open}
			onOpenChange={onOpenChange}
			itemToStringLabel={(item) => item.model}
			isItemEqualToValue={isSameModel}
			autoHighlight
		>
			<Combobox.Trigger
				render={(props, state) => (
					<Button
						{...props}
						aria-label="Model"
						color="neutral"
						variant="outlined"
						size="sm"
						// The button recipe never shrinks; this one gives way so a long name truncates.
						className={cn("min-w-0 shrink", !selection && "text-primary ring-2 ring-primary/40")}
					>
						<span className="truncate">
							<Combobox.Value placeholder="Select model" />
						</span>
						{isLoading ? (
							<Spinner />
						) : (
							<ChevronDownIcon className={cn("transition-transform", state.open && "rotate-180")} />
						)}
					</Button>
				)}
			/>
			<Combobox.Content
				aria-label="Models"
				className="flex w-max max-w-[min(28rem,var(--available-width))] min-w-(--anchor-width) flex-col"
			>
				{isError ? (
					<Notice
						title="Couldn't reach endpoint"
						to="/settings/endpoints"
						icon={<TriangleAlertIcon />}
					>
						Check provider endpoints
					</Notice>
				) : !isLoading && items.length === 0 ? (
					<Notice title="No models yet" to="/library" icon={<LibraryIcon />}>
						Browse the Library
					</Notice>
				) : (
					<>
						<Combobox.Input
							aria-label="Search models"
							placeholder="Search models"
							showTrigger={false}
							groupClassName="m-1 shrink-0"
						/>
						<Combobox.Empty>No matching models</Combobox.Empty>
						<Combobox.List className="min-h-0">
							{(group: ModelItemGroup) => (
								<Combobox.Group key={group.endpoint.id} items={group.items}>
									<Combobox.GroupLabel>{group.endpoint.name}</Combobox.GroupLabel>
									<Combobox.Collection>
										{(item: ModelSelection) => (
											<Combobox.Item key={item.model} value={item}>
												<span className="min-w-0 wrap-anywhere">{item.model}</span>
											</Combobox.Item>
										)}
									</Combobox.Collection>
								</Combobox.Group>
							)}
						</Combobox.List>
					</>
				)}
			</Combobox.Content>
		</Combobox.Root>
	);
}

/** Says why there is nothing to pick, with a link to the page that fixes it. */
function Notice({
	title,
	to,
	icon,
	children,
}: {
	title: string;
	to: "/library" | "/settings/endpoints";
	icon: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1 p-1">
			<p className="px-2 py-1.5 text-xs font-medium text-muted-fg">{title}</p>
			<ButtonLink
				render={<Link to={to} />}
				variant="quiet"
				color="neutral"
				size="sm"
				className="justify-start"
			>
				{icon}
				{children}
			</ButtonLink>
		</div>
	);
}
