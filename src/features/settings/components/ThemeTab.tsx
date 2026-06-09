import { THEME_LABELS, type Theme, useTheme } from "#/features/theme/ThemeProvider";
import { cn } from "#/lib/utils";

const THEME_SWATCHES: Record<Theme, string> = {
	default: "oklch(0.5 0.134 242.749)",
	ocean: "oklch(0.6 0.14 195)",
	forest: "oklch(0.58 0.14 150)",
	rose: "oklch(0.65 0.18 10)",
	midnight: "oklch(0.62 0.2 280)",
};

export function ThemeTab() {
	const { theme, setTheme, themes } = useTheme();

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">Choose an accent color theme.</p>
			<div className="flex flex-wrap gap-3">
				{themes.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTheme(t)}
						className={cn(
							"flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors",
							theme === t && "border-primary bg-primary/5",
						)}
						aria-pressed={theme === t}
					>
						<span
							className="h-8 w-8 rounded-full border"
							style={{ backgroundColor: THEME_SWATCHES[t] }}
						/>
						<span className="text-xs">{THEME_LABELS[t]}</span>
					</button>
				))}
			</div>
		</div>
	);
}
