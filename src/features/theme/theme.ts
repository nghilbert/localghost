import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

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
export type Theme = (typeof THEMES)[number]["id"];

export const THEME_IDS: Theme[] = THEMES.map((theme) => theme.id);

export const MODE_OPTIONS: { label: string; value: string; ModeIcon: LucideIcon }[] = [
	{ label: "Light", value: "light", ModeIcon: SunIcon },
	{ label: "Dark", value: "dark", ModeIcon: MoonIcon },
	{ label: "System", value: "system", ModeIcon: MonitorIcon },
];

export function isTheme(value: string | null | undefined): value is Theme {
	return THEMES.some((theme) => theme.id === value);
}
