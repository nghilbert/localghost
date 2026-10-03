import { createRequire } from "node:module";
import pino from "pino";

/** The server logger: JSON lines in production, pretty-printed in dev. `LOG_LEVEL` sets the level. */
export const log = pino({
	level: process.env.LOG_LEVEL || "info",
	transport: import.meta.env.DEV
		? { target: createRequire(import.meta.url).resolve("pino-pretty") }
		: undefined,
});
