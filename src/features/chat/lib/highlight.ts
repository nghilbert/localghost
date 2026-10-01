import { defaultHighlighter } from "@tanstack/highlight";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";

/** The `highlighter` for `@tanstack/markdown`, with every shipped language. Others render as plain text. */
export const markdownHighlighter = createTanStackMarkdownHighlighter(defaultHighlighter);
