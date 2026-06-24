import { useEffect, useState } from "react";
import type { ColorTheme } from "#/lib/theme";
import { COLOR_THEMES, isColorTheme } from "#/lib/theme";

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
