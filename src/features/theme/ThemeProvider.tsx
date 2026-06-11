import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const MODES: ThemeMode[] = ["light", "dark", "system"];

const MODE_STORAGE_KEY = "odysseus-mode";

export function isThemeMode(value: string | null): value is ThemeMode {
	return MODES.some((mode) => mode === value);
}

type ThemeCtx = {
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
};

const Ctx = createContext<ThemeCtx>({
	mode: "system",
	setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setModeState] = useState<ThemeMode>(() => {
		if (typeof window === "undefined") return "system";
		const stored = localStorage.getItem(MODE_STORAGE_KEY);
		return isThemeMode(stored) ? stored : "system";
	});

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

	return <Ctx value={{ mode, setMode: setModeState }}>{children}</Ctx>;
}

export function useTheme() {
	return useContext(Ctx);
}
