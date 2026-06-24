import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

export const COLOR_THEMES = [
	"default",
	"modern-minimal",
	"clean-slate",
	"bold-tech",
	"elegant-luxury",
	"mocha-mousse",
	"amber-minimal",
	"t3-chat",
	"kodama-grove",
	"northern-lights",
	"sunset-horizon",
	"ocean-breeze",
	"nature",
	"quantum-rose",
	"midnight-bloom",
] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

export const COLOR_THEME_LABELS: Record<ColorTheme, string> = {
	default: "Default",
	"modern-minimal": "Modern Minimal",
	"clean-slate": "Clean Slate",
	"bold-tech": "Bold Tech",
	"elegant-luxury": "Elegant Luxury",
	"mocha-mousse": "Mocha Mousse",
	"amber-minimal": "Amber Minimal",
	"t3-chat": "T3 Chat",
	"kodama-grove": "Kodama Grove",
	"northern-lights": "Northern Lights",
	"sunset-horizon": "Sunset Horizon",
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
