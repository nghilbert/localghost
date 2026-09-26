import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

/**
 * Color presets. Each id matches `[data-theme="<id>"]` in `src/styles/themes/<id>.css`,
 * which restates only the authored tokens. To add one, write that file, import it from
 * `globals.css`, and list it here.
 */
export const THEMES = [
	{ id: "modern-minimal", label: "Modern Minimal" },
	{ id: "clean-slate", label: "Clean Slate" },
	{ id: "bold-tech", label: "Bold Tech" },
	{ id: "elegant-luxury", label: "Elegant Luxury" },
	{ id: "mocha-mousse", label: "Mocha Mousse" },
	{ id: "amber-minimal", label: "Amber Minimal" },
	{ id: "t3-chat", label: "T3 Chat" },
	{ id: "kodama-grove", label: "Kodama Grove" },
	{ id: "northern-lights", label: "Northern Lights" },
	{ id: "sunset-horizon", label: "Sunset Horizon" },
	{ id: "ocean-breeze", label: "Ocean Breeze" },
	{ id: "nature", label: "Nature" },
	{ id: "quantum-rose", label: "Quantum Rose" },
	{ id: "midnight-bloom", label: "Midnight Bloom" },
] as const;
/** A color preset id. */
export type Theme = (typeof THEMES)[number]["id"];

/** Light, dark, or follow the system setting. */
export type ThemeMode = "light" | "dark" | "system";

/** The mode choices, in menu order. */
export const MODE_OPTIONS: { label: string; value: ThemeMode; Icon: LucideIcon }[] = [
	{ label: "Light", value: "light", Icon: SunIcon },
	{ label: "Dark", value: "dark", Icon: MoonIcon },
	{ label: "System", value: "system", Icon: MonitorIcon },
];

/** Whether a stored value is a known preset id. */
export function isTheme(value: string | null | undefined): value is Theme {
	return THEMES.some((theme) => theme.id === value);
}

/** Whether a stored value is a valid mode. */
export function isThemeMode(value: string | null | undefined): value is ThemeMode {
	return value === "light" || value === "dark" || value === "system";
}
