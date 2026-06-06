import {
	type BundledLanguage,
	type BundledTheme,
	createHighlighter,
	type Highlighter,
} from "shiki";

// Common languages to pre-load; others lazy-load on demand
const PRELOADED_LANGS: BundledLanguage[] = [
	"typescript",
	"javascript",
	"tsx",
	"jsx",
	"python",
	"bash",
	"sh",
	"json",
	"yaml",
	"toml",
	"html",
	"css",
	"sql",
	"go",
	"rust",
	"markdown",
	"diff",
];

const LIGHT_THEME: BundledTheme = "github-light";
const DARK_THEME: BundledTheme = "github-dark";

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: [LIGHT_THEME, DARK_THEME],
			langs: PRELOADED_LANGS,
		});
	}
	return highlighterPromise;
}

export async function highlight(code: string, lang: string): Promise<string> {
	const hl = await getHighlighter();

	// Load unknown language dynamically or fall back to plaintext
	const loadedLangs = hl.getLoadedLanguages();
	const resolvedLang = loadedLangs.includes(lang as BundledLanguage) ? lang : "text";
	if (resolvedLang !== lang && lang !== "text" && lang !== "plain") {
		try {
			await hl.loadLanguage(lang as BundledLanguage);
		} catch {
			// Language not found — use text
		}
	}

	return hl.codeToHtml(code, {
		lang: resolvedLang,
		themes: { light: LIGHT_THEME, dark: DARK_THEME },
	});
}
