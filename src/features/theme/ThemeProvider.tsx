import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type Theme = "default" | "ocean" | "forest" | "rose" | "midnight";

const THEMES: Theme[] = ["default", "ocean", "forest", "rose", "midnight"];

export const THEME_LABELS: Record<Theme, string> = {
	default: "Default",
	ocean: "Ocean",
	forest: "Forest",
	rose: "Rose",
	midnight: "Midnight",
};

const STORAGE_KEY = "odysseus-theme";

type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void; themes: Theme[] };

const Ctx = createContext<ThemeCtx>({
	theme: "default",
	setTheme: () => {},
	themes: THEMES,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => {
		if (typeof window === "undefined") return "default";
		return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "default";
	});

	useEffect(() => {
		const root = document.documentElement;
		for (const t of THEMES) root.classList.remove(`theme-${t}`);
		if (theme !== "default") root.classList.add(`theme-${theme}`);
		localStorage.setItem(STORAGE_KEY, theme);
	}, [theme]);

	return <Ctx value={{ theme, setTheme: setThemeState, themes: THEMES }}>{children}</Ctx>;
}

export function useTheme() {
	return useContext(Ctx);
}
