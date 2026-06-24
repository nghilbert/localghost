import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

export const COLOR_THEMES = [
	"default",
	"ocean-breeze",
	"nature",
	"quantum-rose",
	"midnight-bloom",
] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

export const COLOR_THEME_LABELS: Record<ColorTheme, string> = {
	default: "Default",
	"ocean-breeze": "Ocean Breeze",
	nature: "Nature",
	"quantum-rose": "Quantum Rose",
	"midnight-bloom": "Midnight Bloom",
};

export const MODE_OPTIONS: { label: string; value: string; ModeIcon: LucideIcon }[] = [
	{ label: "Light", value: "light", ModeIcon: SunIcon },
	{ label: "Dark", value: "dark", ModeIcon: MoonIcon },
	{ label: "System", value: "system", ModeIcon: MonitorIcon },
];

export const THEME_STORAGE_KEY = "localghost-theme";

export function isColorTheme(value: string | null | undefined): value is ColorTheme {
	return COLOR_THEMES.some((t) => t === value);
}
