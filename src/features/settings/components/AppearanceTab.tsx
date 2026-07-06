import { Field, FieldDescription, FieldLabel, FieldTitle } from "#/components/ui/field";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import {
	COLOR_THEME_LABELS,
	COLOR_THEMES,
	isColorTheme,
	MODE_OPTIONS,
	useColorTheme,
	useTheme,
} from "#/contexts/ThemeContext";
import { useAppForm } from "#/hooks/use-app-form";
import { cn } from "#/lib/utils";

export function AppearanceTab() {
	const { mode, setMode } = useTheme();
	const { colorTheme, setColorTheme } = useColorTheme();

	const form = useAppForm({ defaultValues: { mode, colorTheme: colorTheme ?? "none" } });

	return (
		<form.AppForm>
			<div className="space-y-6">
				<form.AppField name="mode" listeners={{ onChange: ({ value }) => setMode(value) }}>
					{(field) => (
						<field.ToggleGroupField
							label="Mode"
							description="System follows your operating system's light/dark preference."
							variant="outline"
							options={MODE_OPTIONS.map(({ label, value, ModeIcon }) => ({
								label,
								value,
								icon: ModeIcon,
							}))}
						/>
					)}
				</form.AppField>

				<form.AppField
					name="colorTheme"
					listeners={{ onChange: ({ value }) => setColorTheme(isColorTheme(value) ? value : null) }}
				>
					{(field) => (
						<Field>
							<FieldLabel>Theme</FieldLabel>
							<FieldDescription>
								Full color presets — every preset adapts to light and dark mode.
							</FieldDescription>
							<RadioGroup
								value={field.state.value}
								onValueChange={(value) => field.handleChange(isColorTheme(value) ? value : "none")}
								className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
							>
								<FieldLabel htmlFor="theme-none">
									<Field orientation="horizontal">
										<div
											aria-hidden
											className="h-8 w-14 shrink-0 overflow-hidden rounded border flex items-center justify-center text-xs text-muted-foreground"
										/>
										<FieldTitle className="flex-1">None</FieldTitle>
										<RadioGroupItem value="none" id="theme-none" />
									</Field>
								</FieldLabel>
								{COLOR_THEMES.map((colorThemeName) => (
									<FieldLabel key={colorThemeName} htmlFor={`theme-${colorThemeName}`}>
										<Field orientation="horizontal">
											<div
												aria-hidden
												className={cn(
													"h-8 w-14 shrink-0 overflow-hidden rounded border flex flex-col gap-0.5 p-1 bg-background",
													`theme-${colorThemeName}`,
												)}
											>
												<div className="h-1.5 w-8 rounded-full bg-foreground opacity-60" />
												<div className="h-1.5 w-5 rounded-full bg-foreground opacity-30" />
												<div className="mt-auto h-2 w-6 rounded-sm bg-primary" />
											</div>
											<FieldTitle className="flex-1">
												{COLOR_THEME_LABELS[colorThemeName]}
											</FieldTitle>
											<RadioGroupItem value={colorThemeName} id={`theme-${colorThemeName}`} />
										</Field>
									</FieldLabel>
								))}
							</RadioGroup>
						</Field>
					)}
				</form.AppField>
			</div>
		</form.AppForm>
	);
}
