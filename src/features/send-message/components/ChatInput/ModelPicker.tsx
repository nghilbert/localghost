import { Link } from "@tanstack/react-router";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	LibraryIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import type { ModelSelection } from "#/entities/endpoint/types";
import { useEndpointModelGroups } from "#/features/send-message/components/ChatInput/use-endpoint-model-groups";
import { cn } from "#/shared/lib/utils";
import { Button } from "#/shared/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/shared/ui/dropdown-menu";
import { Spinner } from "#/shared/ui/spinner";

type ModelPickerProps = {
	selection: ModelSelection | null;
	onSelect?: (selection: ModelSelection) => void;
};

/** Interactive endpoint and model picker for the draft composer. */
export function ModelPicker({ selection, onSelect }: ModelPickerProps) {
	const [open, setOpen] = useState(false);
	const label = selection?.model ?? "Select model";
	const { groups, isLoading, isError } = useEndpointModelGroups(open);

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
				{isLoading ? <Spinner /> : open ? <ChevronUpIcon /> : <ChevronDownIcon />}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				hidden={isLoading}
				align="start"
				className="w-64"
				data-testid="model-picker-menu"
			>
				<DropdownMenuGroup>
					{isError ? (
						<>
							<DropdownMenuLabel>Couldn't reach endpoint</DropdownMenuLabel>
							<DropdownMenuItem
								data-testid="model-picker-notice"
								render={<Link to="/settings" search={{ tab: "endpoints" }} />}
							>
								<TriangleAlertIcon />
								Check provider endpoints
							</DropdownMenuItem>
						</>
					) : groups.length === 0 ? (
						<>
							<DropdownMenuLabel>No models yet</DropdownMenuLabel>
							<DropdownMenuItem data-testid="model-picker-notice" render={<Link to="/library" />}>
								<LibraryIcon />
								Browse the Library
							</DropdownMenuItem>
						</>
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
