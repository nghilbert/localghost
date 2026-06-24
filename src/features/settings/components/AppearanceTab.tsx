import { useTheme } from "next-themes";
import { Field, FieldDescription, FieldLabel, FieldTitle } from "#/components/ui/field";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { useColorTheme } from "#/hooks/use-color-theme";
import { COLOR_THEME_LABELS, isColorTheme, MODE_OPTIONS } from "#/lib/theme";
import { cn } from "#/lib/utils";

export function AppearanceTab() {
	const { theme = "system", setTheme } = useTheme();
	const { colorTheme, setColorTheme } = useColorTheme();

	return (
		<div className="space-y-6">
			<Field>
				<FieldLabel>Mode</FieldLabel>
				<FieldDescription>
					System follows your operating system's light/dark preference.
				</FieldDescription>
				<ToggleGroup type="single" variant="outline" value={theme} onValueChange={setTheme}>
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
					value={colorTheme}
					onValueChange={(value) => {
						if (isColorTheme(value)) setColorTheme(value);
					}}
					className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
				>
					{Object.entries(COLOR_THEME_LABELS).map(([presetTheme, label]) => (
						<FieldLabel key={presetTheme} htmlFor={`theme-${presetTheme}`}>
							<Field orientation="horizontal">
								<span
									aria-hidden
									className={cn(
										"size-5 shrink-0 rounded-full border bg-primary",
										`theme-${presetTheme}`,
									)}
								/>
								<FieldTitle className="flex-1">{label}</FieldTitle>
								<RadioGroupItem value={presetTheme} id={`theme-${presetTheme}`} />
							</Field>
						</FieldLabel>
					))}
				</RadioGroup>
			</Field>
		</div>
	);
}
