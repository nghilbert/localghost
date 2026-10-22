import { fileURLToPath } from "node:url";
import eslintReact from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import regexp from "eslint-plugin-regexp";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig, includeIgnoreFile } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
	includeIgnoreFile(fileURLToPath(new URL(".gitignore", import.meta.url))),
	{ ignores: ["src/routeTree.gen.ts"] },
	{
		files: ["**/*.{ts,tsx}"],
		extends: [
			js.configs.recommended,
			tseslint.configs.strictTypeChecked,
			tseslint.configs.stylisticTypeChecked,
			unicorn.configs.unopinionated,
			regexp.configs.recommended,
			reactHooks.configs.flat["recommended-latest"],
			eslintReact.configs["strict-type-checked"],
			pluginQuery.configs["flat/recommended-strict"],
			pluginRouter.configs["flat/recommended"],
		],
		languageOptions: {
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
		},
		// Matches `reactCompilerPreset` in vite.config.ts, which compiles in infer mode.
		settings: { "react-x": { compilationMode: "infer" } },
		linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
		rules: {
			"@typescript-eslint/array-type": ["error", { default: "array-simple" }],
			"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
			// Destructuring a key out with a rest sibling is how an entry is dropped immutably.
			"@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
			// `redirect()` and `notFound()` are thrown by design.
			"@typescript-eslint/only-throw-error": [
				"error",
				{
					allow: [
						{ from: "package", package: "@tanstack/router-core", name: "Redirect" },
						{ from: "package", package: "@tanstack/router-core", name: "NotFoundError" },
					],
				},
			],
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{ allowAny: false, allowBoolean: false, allowNullish: false, allowRegExp: false },
			],
			// If/else is often clearer.
			"unicorn/prefer-ternary": "off",
		},
	},
	{
		// Tool configs export `defineConfig()` at the top level.
		files: ["*.config.ts"],
		rules: { "unicorn/no-top-level-side-effects": "off" },
	},
	{
		files: ["**/*.test.{ts,tsx}", "src/test/**"],
		extends: [vitest.configs.recommended],
		settings: { vitest: { vitestImports: ["#/test/msw"] } },
		rules: {
			// Vitest fixtures must destructure their context, even one they do not read.
			"no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
		},
	},
	prettier,
);
