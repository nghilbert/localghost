import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { isTheme, isThemeMode, MODE_STORAGE_KEY, THEME_STORAGE_KEY, THEMES } from "./lib/constants";
import type { Theme, ThemeMode } from "./lib/types";

type ThemeContextValue = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	themes: Theme[];
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
	theme: "default",
	setTheme: () => {},
	themes: THEMES,
	mode: "system",
	setMode: () => {},
});

export function ThemeProvider({ children }: PropsWithChildren) {
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
		<ThemeContext.Provider
			value={{ theme, setTheme: setThemeState, themes: THEMES, mode, setMode: setModeState }}
		>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	return useContext(ThemeContext);
}
