import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Field, FieldDescription, FieldLabel, FieldTitle } from "#/components/ui/field";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import {
	isTheme,
	isThemeMode,
	THEME_LABELS,
	type ThemeMode,
	useTheme,
} from "#/features/theme/ThemeProvider";
import { cn } from "#/lib/utils";

const MODE_OPTIONS: { value: ThemeMode; label: string; icon: typeof SunIcon }[] = [
	{ value: "light", label: "Light", icon: SunIcon },
	{ value: "dark", label: "Dark", icon: MoonIcon },
	{ value: "system", label: "System", icon: MonitorIcon },
];

export function ThemeTab() {
	const { theme, setTheme, themes, mode, setMode } = useTheme();

	return (
		<div className="space-y-6">
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

			<Field>
				<FieldLabel>Theme</FieldLabel>
				<FieldDescription>
					Full color presets — every preset adapts to light and dark mode.
				</FieldDescription>
				<RadioGroup
					value={theme}
					onValueChange={(value) => {
						if (isTheme(value)) setTheme(value);
					}}
					className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
				>
					{themes.map((presetTheme) => (
						<FieldLabel key={presetTheme} htmlFor={`theme-${presetTheme}`}>
							<Field orientation="horizontal">
								<span
									aria-hidden
									className={cn(
										"size-5 shrink-0 rounded-full border bg-primary",
										`theme-${presetTheme}`,
									)}
								/>
								<FieldTitle className="flex-1">{THEME_LABELS[presetTheme]}</FieldTitle>
								<RadioGroupItem value={presetTheme} id={`theme-${presetTheme}`} />
							</Field>
						</FieldLabel>
					))}
				</RadioGroup>
			</Field>
		</div>
	);
}
