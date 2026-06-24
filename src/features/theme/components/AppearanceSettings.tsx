import { Field, FieldDescription, FieldLabel, FieldTitle } from "#/components/ui/field";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { cn } from "#/lib/utils";
import { isTheme, isThemeMode, MODE_OPTIONS, THEME_LABELS } from "../lib/constants";
import { useTheme } from "../ThemeProvider";

export function AppearanceSettings() {
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
					{MODE_OPTIONS.map(({ label, value, ModeIcon }) => (
						<ToggleGroupItem key={value} value={value} aria-label={label}>
							<ModeIcon />
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
