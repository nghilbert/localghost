import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type { Theme, ThemeMode } from "./types";

export const MODE_OPTIONS: { label: string; value: ThemeMode; ModeIcon: LucideIcon }[] = [
	{ label: "Light", value: "light", ModeIcon: SunIcon },
	{ label: "Dark", value: "dark", ModeIcon: MoonIcon },
	{ label: "System", value: "system", ModeIcon: MonitorIcon },
];

export const THEMES: Theme[] = [
	"default",
	"ocean-breeze",
	"nature",
	"quantum-rose",
	"midnight-bloom",
];
export const MODES: ThemeMode[] = ["light", "dark", "system"];

export const THEME_LABELS: Record<Theme, string> = {
	default: "Default",
	"ocean-breeze": "Ocean Breeze",
	nature: "Nature",
	"quantum-rose": "Quantum Rose",
	"midnight-bloom": "Midnight Bloom",
};

export const THEME_STORAGE_KEY = "localghost-theme";
export const MODE_STORAGE_KEY = "localghost-mode";

export function isTheme(value: string | null): value is Theme {
	return THEMES.some((theme) => theme === value);
}

export function isThemeMode(value: string | null): value is ThemeMode {
	return MODES.some((mode) => mode === value);
}
