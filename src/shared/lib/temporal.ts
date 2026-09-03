import { Temporal } from "temporal-polyfill";

/** The current instant as a `Temporal.PlainDateTime` (UTC). The contract's
 * `updatedAt` columns have no DB-level default, matching classic Prisma's
 * `@updatedAt` (client-managed, not DB-triggered): callers pass this explicitly. */
export function nowTimestamp(): Temporal.PlainDateTime {
	return Temporal.Now.plainDateTimeISO("UTC");
}
