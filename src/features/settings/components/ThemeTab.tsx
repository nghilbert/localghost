import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { isThemeMode, type ThemeMode, useTheme } from "#/features/theme/ThemeProvider";

const MODE_OPTIONS: { value: ThemeMode; label: string; icon: typeof SunIcon }[] = [
	{ value: "light", label: "Light", icon: SunIcon },
	{ value: "dark", label: "Dark", icon: MoonIcon },
	{ value: "system", label: "System", icon: MonitorIcon },
];

export function ThemeTab() {
	const { mode, setMode } = useTheme();

	return (
		<Field>
			<FieldLabel>Mode</FieldLabel>
			<FieldDescription>
				System follows your operating system's light/dark preference.
			</FieldDescription>
			<ToggleGroup
				type="single"
				variant="outline"
				value={mode}
				onValueChange={(value) => {
					if (isThemeMode(value)) setMode(value);
				}}
			>
				{MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
					<ToggleGroupItem key={value} value={value} aria-label={label}>
						<Icon size={14} />
						{label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</Field>
	);
}
