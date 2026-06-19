import { Input } from "#/components/ui/input";

type MyModelTableToolbarProps = {
	globalFilter: string;
	onGlobalFilterChange: (value: string) => void;
	rowCount: number;
};

export function MyModelTableToolbar({
	globalFilter,
	onGlobalFilterChange,
	rowCount,
}: MyModelTableToolbarProps) {
	return (
		<div className="flex items-center gap-2">
			<Input
				placeholder="Search models…"
				value={globalFilter}
				onChange={(e) => onGlobalFilterChange(e.target.value)}
				className="max-w-xs h-8 text-sm"
			/>
			<span className="ml-auto text-xs text-muted-foreground">
				{rowCount} model{rowCount !== 1 ? "s" : ""}
			</span>
		</div>
	);
}
