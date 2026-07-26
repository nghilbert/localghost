import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/shared/components/ui/select";

const ALL_LICENSES = "all";

type LicenseFilterProps = {
	/** Distinct license ids present in the cached catalog, from the server's `availableLicenses`. */
	licenses: string[];
	value: string | undefined;
	onValueChange: (value: string | undefined) => void;
};

/** Narrows the catalog to a single license; hidden entirely until the catalog reports any. */
export function LicenseFilter({ licenses, value, onValueChange }: LicenseFilterProps) {
	if (licenses.length === 0) return null;

	return (
		<Select
			value={value ?? ALL_LICENSES}
			onValueChange={(next) => onValueChange(!next || next === ALL_LICENSES ? undefined : next)}
		>
			<SelectTrigger className="w-auto" data-testid="model-license-filter">
				<SelectValue placeholder="All licenses" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={ALL_LICENSES}>All licenses</SelectItem>
				{licenses.map((license) => (
					<SelectItem key={license} value={license}>
						{license}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
