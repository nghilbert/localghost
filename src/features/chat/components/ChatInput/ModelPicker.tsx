import { Link, type LinkProps } from "@tanstack/react-router";
import {
	CheckIcon,
	ChevronDownIcon,
	LibraryIcon,
	type LucideIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Spinner } from "#/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { useEndpointModelGroups } from "#/features/endpoints/hooks/use-endpoint-model-groups";
import type { ModelSelection } from "#/features/endpoints/lib/types";
import { cn } from "#/lib/utils";

type PickerNotice = {
	icon: LucideIcon | typeof Spinner;
	label: string;
	hint: string;
	link?: { to: LinkProps["to"]; search?: LinkProps["search"] };
};

/**
 * The one row shown in place of the model list when the list can't be, in priority
 * order. Null means models are available and the list itself should render.
 */
function resolvePickerNotice({
	isLoading,
	isError,
	isEmpty,
}: {
	isLoading: boolean;
	isError: boolean;
	isEmpty: boolean;
}): PickerNotice | null {
	if (isLoading) {
		return {
			icon: Spinner,
			label: "Loading models…",
			hint: "Fetching available models",
		};
	}
	if (isError) {
		return {
			icon: TriangleAlertIcon,
			label: "Check provider endpoints",
			hint: "Couldn't reach endpoint",
			link: { to: "/settings", search: { tab: "endpoints" } },
		};
	}
	if (isEmpty) {
		return {
			icon: LibraryIcon,
			label: "Browse the Library",
			hint: "No models yet",
			link: { to: "/library" },
		};
	}
	return null;
}

type ModelPickerProps = {
	selection: ModelSelection | null;
	onSelect?: (selection: ModelSelection) => void;
};

/** Interactive endpoint and model picker for the draft composer. */
export function ModelPicker({ selection, onSelect }: ModelPickerProps) {
	const [open, setOpen] = useState(false);
	const label = selection?.model ?? "Select model";
	const { groups, isLoading, isError } = useEndpointModelGroups(open);
	const notice = resolvePickerNotice({ isLoading, isError, isEmpty: groups.length === 0 });

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				data-testid="model-picker-trigger"
				render={
					<Button
						variant="outline"
						size="sm"
						className={cn("gap-1 truncate", !selection && "text-primary ring-2 ring-primary/40")}
					/>
				}
			>
				<span className="truncate">{label}</span>
				<ChevronDownIcon size={14} className="shrink-0" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64" data-testid="model-picker-menu">
				<DropdownMenuGroup>
					{notice ? (
						<Tooltip>
							<TooltipTrigger
								render={<span className={cn(!notice.link && "cursor-not-allowed")} />}
							>
								<DropdownMenuItem
									disabled={!notice.link}
									data-testid="model-picker-notice"
									render={notice.link ? <Link {...notice.link} /> : undefined}
								>
									<notice.icon />
									{notice.label}
								</DropdownMenuItem>
							</TooltipTrigger>
							<TooltipContent>{notice.hint}</TooltipContent>
						</Tooltip>
					) : (
						groups.map(({ endpoint, models }, i) => (
							<Fragment key={endpoint.id}>
								{i > 0 && <DropdownMenuSeparator />}
								<DropdownMenuLabel data-testid={`model-group-${endpoint.id}`}>
									{endpoint.name}
								</DropdownMenuLabel>
								{models.map((model) => {
									const isSelected =
										selection?.endpointId === endpoint.id && selection?.model === model;
									return (
										<DropdownMenuItem
											key={model}
											data-testid={`model-item-${endpoint.id}-${model}`}
											onClick={() => onSelect?.({ endpointId: endpoint.id, model })}
										>
											<span className="truncate">{model}</span>
											{isSelected && <CheckIcon size={13} className="ml-auto shrink-0" />}
										</DropdownMenuItem>
									);
								})}
							</Fragment>
						))
					)}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
