import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";

const STATUS_FILTERS = ["all", "installed", "available"] as const;

export type ModelStatusFilter = (typeof STATUS_FILTERS)[number];

function isModelStatusFilter(value: string): value is ModelStatusFilter {
	return STATUS_FILTERS.some((filter) => filter === value);
}

type ModelTableToolbarProps = {
	globalFilter: string;
	onGlobalFilterChange: (value: string) => void;
	statusFilter: ModelStatusFilter;
	onStatusFilterChange: (value: ModelStatusFilter) => void;
	rowCount: number;
};

export function ModelTableToolbar({
	globalFilter,
	onGlobalFilterChange,
	statusFilter,
	onStatusFilterChange,
	rowCount,
}: ModelTableToolbarProps) {
	return (
		<div className="flex items-center gap-2">
			<Input
				placeholder="Search models…"
				value={globalFilter}
				onChange={(e) => onGlobalFilterChange(e.target.value)}
				className="max-w-xs h-8 text-sm"
			/>
			<Select
				value={statusFilter}
				onValueChange={(value) => {
					if (isModelStatusFilter(value)) onStatusFilterChange(value);
				}}
			>
				<SelectTrigger className="h-8 w-36 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All models</SelectItem>
					<SelectItem value="installed">Installed</SelectItem>
					<SelectItem value="available">Not installed</SelectItem>
				</SelectContent>
			</Select>
			<span className="ml-auto text-xs text-muted-foreground">
				{rowCount} model{rowCount !== 1 ? "s" : ""}
			</span>
		</div>
	);
}
