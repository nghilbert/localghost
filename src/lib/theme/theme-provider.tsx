import { ScriptOnce } from "@tanstack/react-router";
import { createContext, type ReactNode, use, useEffect, useSyncExternalStore } from "react";
import { isTheme, isThemeMode, THEMES, type Theme, type ThemeMode } from "./theme";

type ThemeContextValue = {
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
	theme: Theme | null;
	setTheme: (theme: Theme | null) => void;
};

const MODE_STORAGE_KEY = "theme-mode";
const THEME_STORAGE_KEY = "theme-preset";

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** A blocking script that applies the stored mode and theme before hydration, so the page never flashes the wrong theme. */
function getThemeScript(defaultMode: ThemeMode) {
	const modeKey = JSON.stringify(MODE_STORAGE_KEY);
	const themeKey = JSON.stringify(THEME_STORAGE_KEY);
	const fallback = JSON.stringify(defaultMode);
	const themes = JSON.stringify(THEMES.map(({ id }) => id));

	return `(function(){try{var e=document.documentElement;var m=localStorage.getItem(${modeKey});if(m!=='light'&&m!=='dark'&&m!=='system'){m=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=m==='system'?(d?'dark':'light'):m;e.classList.add(r);e.style.colorScheme=r;var c=localStorage.getItem(${themeKey});if(c&&${themes}.indexOf(c)>-1){e.dataset.theme=c}}catch(e){}})();`;
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
	if (theme) root.dataset.theme = theme;
	else delete root.dataset.theme;
}

// The setters notify through this; the `storage` event only fires in other tabs.
const storageChanges = new EventTarget();

function subscribe(onChange: () => void) {
	storageChanges.addEventListener("change", onChange);
	return () => storageChanges.removeEventListener("change", onChange);
}

function getStoredMode(): ThemeMode | null {
	const stored = localStorage.getItem(MODE_STORAGE_KEY);
	return isThemeMode(stored) ? stored : null;
}

function getStoredTheme(): Theme | null {
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	return isTheme(stored) ? stored : null;
}

// Server and hydration render the defaults; `getThemeScript` already painted the stored ones.
function getServerValue() {
	return null;
}

type ThemeProviderProps = {
	children: ReactNode;
	defaultMode?: ThemeMode;
};

/** Applies and stores the light/dark mode and color preset for the app. */
export function ThemeProvider({ children, defaultMode = "system" }: ThemeProviderProps) {
	const mode = useSyncExternalStore(subscribe, getStoredMode, getServerValue) ?? defaultMode;
	const theme = useSyncExternalStore(subscribe, getStoredTheme, getServerValue);

	useEffect(() => {
		if (mode !== "system") return;

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyMode("system");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode]);

	const setMode = (next: ThemeMode) => {
		localStorage.setItem(MODE_STORAGE_KEY, next);
		applyMode(next);
		storageChanges.dispatchEvent(new Event("change"));
	};

	const setTheme = (next: Theme | null) => {
		if (next) localStorage.setItem(THEME_STORAGE_KEY, next);
		else localStorage.removeItem(THEME_STORAGE_KEY);
		applyTheme(next);
		storageChanges.dispatchEvent(new Event("change"));
	};

	return (
		<ThemeContext value={{ mode, setMode, theme, setTheme }}>
			<ScriptOnce>{getThemeScript(defaultMode)}</ScriptOnce>
			{children}
		</ThemeContext>
	);
}

/** The current mode and preset, with setters. Must be inside {@link ThemeProvider}. */
export function useTheme() {
	const context = use(ThemeContext);
	if (context === null) throw new Error("useTheme must be used within a ThemeProvider");
	return context;
}
