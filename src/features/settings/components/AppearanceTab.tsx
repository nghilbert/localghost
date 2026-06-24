import { useTheme } from "next-themes";
import { Field, FieldDescription, FieldLabel, FieldTitle } from "#/components/ui/field";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { useColorTheme } from "#/hooks/use-color-theme";
import type { ColorTheme } from "#/lib/theme";
import { COLOR_THEME_LABELS, MODE_OPTIONS } from "#/lib/theme";
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
					value={colorTheme ?? "default"}
					onValueChange={(value) => setColorTheme(value as ColorTheme | "default")}
					className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
				>
					<FieldLabel htmlFor="theme-default">
						<Field orientation="horizontal">
							<div
								aria-hidden
								className="h-8 w-14 shrink-0 overflow-hidden rounded border flex items-center justify-center text-xs text-muted-foreground"
							>
								None
							</div>
							<FieldTitle className="flex-1">Default</FieldTitle>
							<RadioGroupItem value="default" id="theme-default" />
						</Field>
					</FieldLabel>
					{Object.entries(COLOR_THEME_LABELS).map(([themeName, label]) => (
						<FieldLabel key={themeName} htmlFor={`theme-${themeName}`}>
							<Field orientation="horizontal">
								<div
									aria-hidden
									className={cn(
										"h-8 w-14 shrink-0 overflow-hidden rounded border flex flex-col gap-0.5 p-1 bg-background",
										`theme-${themeName}`,
									)}
								>
									<div className="h-1.5 w-8 rounded-full bg-foreground opacity-60" />
									<div className="h-1.5 w-5 rounded-full bg-foreground opacity-30" />
									<div className="mt-auto h-2 w-6 rounded-sm bg-primary" />
								</div>
								<FieldTitle className="flex-1">{label}</FieldTitle>
								<RadioGroupItem value={themeName} id={`theme-${themeName}`} />
							</Field>
						</FieldLabel>
					))}
				</RadioGroup>
			</Field>
		</div>
	);
}
