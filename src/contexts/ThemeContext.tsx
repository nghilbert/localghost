import { ScriptOnce } from "@tanstack/react-router";
import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { createContext, use, useEffect, useState } from "react";

type ThemeMode = "dark" | "light" | "system";

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultMode?: ThemeMode;
	storageKey?: string;
};

type ThemeContextValue = { mode: ThemeMode; setMode: (mode: ThemeMode) => void };

function getModeScript(storageKey: string, defaultMode: ThemeMode) {
	const key = JSON.stringify(storageKey);
	const fallback = JSON.stringify(defaultMode);

	return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
}

const ThemeContext = createContext<ThemeContextValue>({
	mode: "system",
	setMode: () => {},
});

function applyMode(mode: ThemeMode) {
	const root = document.documentElement;
	root.classList.remove("light", "dark");

	const resolved =
		mode === "system"
			? window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light"
			: mode;

	root.classList.add(resolved);
	root.style.colorScheme = resolved;
}

export function ThemeProvider({
	children,
	defaultMode = "system",
	storageKey = "localghost-mode",
}: ThemeProviderProps) {
	const [mode, setModeState] = useState<ThemeMode>(defaultMode);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem(storageKey);
		setModeState(
			stored === "light" || stored === "dark" || stored === "system" ? stored : defaultMode,
		);
		setMounted(true);
	}, [defaultMode, storageKey]);

	useEffect(() => {
		if (!mounted) return;
		applyMode(mode);
	}, [mode, mounted]);

	useEffect(() => {
		if (!mounted || mode !== "system") return;

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyMode("system");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode, mounted]);

	const setMode = (next: ThemeMode) => {
		localStorage.setItem(storageKey, next);
		setModeState(next);
	};

	return (
		<ThemeContext value={{ mode, setMode }}>
			<ScriptOnce>{getModeScript(storageKey, defaultMode)}</ScriptOnce>
			{children}
		</ThemeContext>
	);
}

export function useTheme() {
	const context = use(ThemeContext);
	if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
	return context;
}

export const COLOR_THEMES = [
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

export function isColorTheme(value: string | null | undefined): value is ColorTheme {
	return COLOR_THEMES.some((t) => t === value);
}

const STORAGE_KEY = "localghost-color-theme";

export function useColorTheme() {
	const [colorTheme, setColorThemeState] = useState<ColorTheme | null>(() => {
		if (typeof window === "undefined") return null;
		const stored = localStorage.getItem(STORAGE_KEY);
		return isColorTheme(stored) ? stored : null;
	});

	useEffect(() => {
		const root = document.documentElement;
		for (const themeName of COLOR_THEMES) root.classList.remove(`theme-${themeName}`);
		if (colorTheme) {
			root.classList.add(`theme-${colorTheme}`);
			localStorage.setItem(STORAGE_KEY, colorTheme);
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	}, [colorTheme]);

	function setColorTheme(value: ColorTheme | null) {
		setColorThemeState(value);
	}

	return { colorTheme, setColorTheme };
}
