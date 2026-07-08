import { useAppForm } from "#/shared/hooks/use-app-form";
import { cn } from "#/shared/lib/utils";
import { useTheme } from "#/shared/theme/ThemeContext";
import { isTheme, MODE_OPTIONS, THEMES } from "#/shared/theme/theme";
import { Field, FieldDescription, FieldLabel, FieldTitle } from "#/shared/ui/field";
import { RadioGroup, RadioGroupItem } from "#/shared/ui/radio-group";

export function AppearanceTab() {
	const { mode, setMode, theme, setTheme } = useTheme();

	const form = useAppForm({ defaultValues: { mode, theme: theme ?? "none" } });

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
					name="theme"
					listeners={{ onChange: ({ value }) => setTheme(isTheme(value) ? value : null) }}
				>
					{(field) => (
						<Field>
							<FieldLabel>Theme</FieldLabel>
							<FieldDescription>
								Full color presets — every preset adapts to light and dark mode.
							</FieldDescription>
							<RadioGroup
								value={field.state.value}
								onValueChange={(value) => field.handleChange(isTheme(value) ? value : "none")}
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
								{THEMES.map((theme) => (
									<FieldLabel key={theme.id} htmlFor={`theme-${theme.id}`}>
										<Field orientation="horizontal">
											<div
												aria-hidden
												className={cn(
													"h-8 w-14 shrink-0 overflow-hidden rounded border flex flex-col gap-0.5 p-1 bg-background",
													`theme-${theme.id}`,
												)}
											>
												<div className="h-1.5 w-8 rounded-full bg-foreground opacity-60" />
												<div className="h-1.5 w-5 rounded-full bg-foreground opacity-30" />
												<div className="mt-auto h-2 w-6 rounded-sm bg-primary" />
											</div>
											<FieldTitle className="flex-1">{theme.label}</FieldTitle>
											<RadioGroupItem value={theme.id} id={`theme-${theme.id}`} />
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
