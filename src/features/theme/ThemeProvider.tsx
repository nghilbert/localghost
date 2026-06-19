import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type Theme = "default" | "ocean-breeze" | "nature" | "quantum-rose" | "midnight-bloom";
export type ThemeMode = "light" | "dark" | "system";

const THEMES: Theme[] = ["default", "ocean-breeze", "nature", "quantum-rose", "midnight-bloom"];
const MODES: ThemeMode[] = ["light", "dark", "system"];

export const THEME_LABELS: Record<Theme, string> = {
	default: "Default",
	"ocean-breeze": "Ocean Breeze",
	nature: "Nature",
	"quantum-rose": "Quantum Rose",
	"midnight-bloom": "Midnight Bloom",
};

const THEME_STORAGE_KEY = "localghost-theme";
const MODE_STORAGE_KEY = "localghost-mode";

export function isTheme(value: string | null): value is Theme {
	return THEMES.some((theme) => theme === value);
}

export function isThemeMode(value: string | null): value is ThemeMode {
	return MODES.some((mode) => mode === value);
}

type ThemeCtx = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	themes: Theme[];
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
};

const Ctx = createContext<ThemeCtx>({
	theme: "default",
	setTheme: () => {},
	themes: THEMES,
	mode: "system",
	setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => {
		if (typeof window === "undefined") return "default";
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		return isTheme(stored) ? stored : "default";
	});

	const [mode, setModeState] = useState<ThemeMode>(() => {
		if (typeof window === "undefined") return "system";
		const stored = localStorage.getItem(MODE_STORAGE_KEY);
		return isThemeMode(stored) ? stored : "system";
	});

	useEffect(() => {
		const root = document.documentElement;
		for (const t of THEMES) root.classList.remove(`theme-${t}`);
		if (theme !== "default") root.classList.add(`theme-${theme}`);
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	}, [theme]);

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		function applyMode() {
			const isDark = mode === "dark" || (mode === "system" && media.matches);
			document.documentElement.classList.toggle("dark", isDark);
		}
		applyMode();
		localStorage.setItem(MODE_STORAGE_KEY, mode);
		if (mode !== "system") return;
		media.addEventListener("change", applyMode);
		return () => media.removeEventListener("change", applyMode);
	}, [mode]);

	return (
		<Ctx value={{ theme, setTheme: setThemeState, themes: THEMES, mode, setMode: setModeState }}>
			{children}
		</Ctx>
	);
}

export function useTheme() {
	return useContext(Ctx);
}
