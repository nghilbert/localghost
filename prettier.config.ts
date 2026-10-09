import type { PluginConfig } from "@ianvs/prettier-plugin-sort-imports";
import type { Config } from "prettier";
import type { PluginOptions } from "prettier-plugin-tailwindcss";

const config: Config & PluginConfig & PluginOptions = {
	useTabs: true,
	printWidth: 100,
	// The Tailwind plugin must come last.
	plugins: ["@ianvs/prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],
	importOrder: ["<BUILTIN_MODULES>", "<THIRD_PARTY_MODULES>", "^#/", "^[.]"],
	tailwindStylesheet: "./src/styles/index.css",
	tailwindFunctions: ["tv", "cn"],
};

export default config;
