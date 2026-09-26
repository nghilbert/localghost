import { useAppForm } from "#/components/form/use-app-form";
import { SettingsSection } from "#/components/layout/SettingsSection";
import { Field } from "#/components/ui/field";
import { Radio } from "#/components/ui/radio";
import { RadioGroup } from "#/components/ui/radio-group";
import { isTheme, isThemeMode, MODE_OPTIONS, THEMES } from "#/lib/theme/theme";
import { useTheme } from "#/lib/theme/theme-provider";

// Also the swatch's `data-theme`, which `tokens.css` pins to the default palette.
const DEFAULT_THEME = "default";
const THEME_OPTIONS = [{ id: DEFAULT_THEME, label: "Default" }, ...THEMES];

/** The light or dark mode and color theme settings. */
export function AppearanceTab() {
	const { mode, setMode, theme, setTheme } = useTheme();

	const form = useAppForm({ defaultValues: { mode, theme: theme ?? DEFAULT_THEME } });

	return (
		<form.AppForm>
			<SettingsSection title="Appearance">
				<form.AppField
					name="mode"
					listeners={{ onChange: ({ value }) => isThemeMode(value) && setMode(value) }}
				>
					{(field) => (
						<field.ToggleGroupField
							label="Mode"
							description="System follows your operating system's light/dark preference."
							variant="outlined"
							options={MODE_OPTIONS.map(({ label, value, Icon }) => ({ label, value, icon: Icon }))}
						/>
					)}
				</form.AppField>

				<form.AppField
					name="theme"
					listeners={{ onChange: ({ value }) => setTheme(isTheme(value) ? value : null) }}
				>
					{(field) => (
						<field.CustomField
							label="Theme"
							description="Full color presets; every preset adapts to light and dark mode."
							fieldOrientation="vertical"
						>
							<RadioGroup
								value={field.state.value}
								onValueChange={(value) =>
									field.handleChange(isTheme(value) ? value : DEFAULT_THEME)
								}
								className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
							>
								{THEME_OPTIONS.map((option) => (
									<Field.Item key={option.id}>
										<Field.Label className="w-full rounded-lg p-2.5 font-normal ring-1 ring-line has-data-checked:bg-primary-soft has-data-checked:ring-primary">
											<div
												aria-hidden
												data-theme={option.id}
												className="flex h-8 w-14 shrink-0 flex-col gap-0.5 overflow-hidden rounded-sm bg-bg p-1 ring-1 ring-line"
											>
												<div className="h-1.5 w-8 rounded-full bg-fg opacity-60" />
												<div className="h-1.5 w-5 rounded-full bg-fg opacity-30" />
												<div className="mt-auto h-2 w-6 rounded-sm bg-primary" />
											</div>
											<span className="flex-1">{option.label}</span>
											<Radio value={option.id} />
										</Field.Label>
									</Field.Item>
								))}
							</RadioGroup>
						</field.CustomField>
					)}
				</form.AppField>
			</SettingsSection>
		</form.AppForm>
	);
}
