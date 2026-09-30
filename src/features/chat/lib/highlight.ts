import { createHighlighter } from "@tanstack/highlight/core";
import { cpp } from "@tanstack/highlight/languages/cpp";
import { css } from "@tanstack/highlight/languages/css";
import { diff } from "@tanstack/highlight/languages/diff";
import { dockerfile } from "@tanstack/highlight/languages/dockerfile";
import { go } from "@tanstack/highlight/languages/go";
import { html } from "@tanstack/highlight/languages/html";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { jsx } from "@tanstack/highlight/languages/jsx";
import { markdown } from "@tanstack/highlight/languages/markdown";
import { plaintext } from "@tanstack/highlight/languages/plaintext";
import { python } from "@tanstack/highlight/languages/python";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { toml } from "@tanstack/highlight/languages/toml";
import { ts } from "@tanstack/highlight/languages/ts";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { yaml } from "@tanstack/highlight/languages/yaml";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";

/** The `highlighter` for `@tanstack/markdown`. Other languages render as plain text. */
export const markdownHighlighter = createTanStackMarkdownHighlighter(
	createHighlighter({
		languages: [
			cpp,
			css,
			diff,
			dockerfile,
			go,
			html,
			js,
			json,
			jsx,
			markdown,
			plaintext,
			python,
			shell,
			sql,
			toml,
			ts,
			tsx,
			yaml,
		],
	}),
);
