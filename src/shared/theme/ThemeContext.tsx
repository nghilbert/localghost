import { ScriptOnce } from "@tanstack/react-router";
import { createContext, type ReactNode, use, useEffect, useState } from "react";
import { isTheme, THEMES, type Theme } from "./theme";

type ThemeMode = "dark" | "light" | "system";

type ThemeContextValue = {
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
	theme: Theme | null;
	setTheme: (theme: Theme | null) => void;
};

const MODE_STORAGE_KEY = "localghost-mode";
const THEME_STORAGE_KEY = "localghost-color-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Builds the blocking pre-hydration script that applies the persisted mode and theme
 * classes to `<html>` before React hydrates, preventing a flash of the wrong theme.
 */
function getThemeScript(defaultMode: ThemeMode) {
	const modeKey = JSON.stringify(MODE_STORAGE_KEY);
	const themeKey = JSON.stringify(THEME_STORAGE_KEY);
	const fallback = JSON.stringify(defaultMode);
	const themes = JSON.stringify(THEMES);

	return `(function(){try{var e=document.documentElement;var m=localStorage.getItem(${modeKey});if(m!=='light'&&m!=='dark'&&m!=='system'){m=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=m==='system'?(d?'dark':'light'):m;e.classList.add(r);e.style.colorScheme=r;var c=localStorage.getItem(${themeKey});if(c&&${themes}.indexOf(c)>-1){e.classList.add('theme-'+c)}}catch(e){}})();`;
}

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

function applyTheme(theme: Theme | null) {
	const root = document.documentElement;
	for (const { id } of THEMES) root.classList.remove(`theme-${id}`);
	if (theme) root.classList.add(`theme-${theme}`);
}

type ThemeProviderProps = {
	children: ReactNode;
	defaultMode?: ThemeMode;
};
export function ThemeProvider({ children, defaultMode = "system" }: ThemeProviderProps) {
	const [mode, setModeState] = useState<ThemeMode>(defaultMode);
	const [theme, setThemeState] = useState<Theme | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
		if (storedMode === "light" || storedMode === "dark" || storedMode === "system") {
			setModeState(storedMode);
		}

		const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
		if (isTheme(storedTheme)) setThemeState(storedTheme);

		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted) return;
		applyMode(mode);
	}, [mode, mounted]);

	useEffect(() => {
		if (!mounted) return;
		applyTheme(theme);
	}, [theme, mounted]);

	useEffect(() => {
		if (!mounted || mode !== "system") return;

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyMode("system");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode, mounted]);

	const setMode = (next: ThemeMode) => {
		localStorage.setItem(MODE_STORAGE_KEY, next);
		setModeState(next);
	};

	const setTheme = (next: Theme | null) => {
		if (next) localStorage.setItem(THEME_STORAGE_KEY, next);
		else localStorage.removeItem(THEME_STORAGE_KEY);
		setThemeState(next);
	};

	return (
		<ThemeContext value={{ mode, setMode, theme, setTheme }}>
			<ScriptOnce>{getThemeScript(defaultMode)}</ScriptOnce>
			{children}
		</ThemeContext>
	);
}

export function useTheme() {
	const context = use(ThemeContext);
	if (context === null) throw new Error("useTheme must be used within a ThemeProvider");
	return context;
}
