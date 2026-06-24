import { useEffect, useState } from "react";
import type { ColorTheme } from "#/lib/theme";
import { COLOR_THEME_LABELS, isColorTheme } from "#/lib/theme";

const STORAGE_KEY = "localghost-color-theme";

export function useColorTheme() {
	const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
		if (typeof window === "undefined") return "default";
		const stored = localStorage.getItem(STORAGE_KEY);
		return isColorTheme(stored) ? stored : "default";
	});

	useEffect(() => {
		const root = document.documentElement;
		for (const t in COLOR_THEME_LABELS) root.classList.remove(`theme-${t}`);
		if (colorTheme !== "default") root.classList.add(`theme-${colorTheme}`);
		localStorage.setItem(STORAGE_KEY, colorTheme);
	}, [colorTheme]);

	return { colorTheme, setColorTheme: setColorThemeState };
}
