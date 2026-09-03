// Node has no global Temporal implementation yet; the runtime's "now" mutation
// defaults (createdAt/updatedAt) need one. Must load before `postgres(...)`
// constructs, since every Temporal-typed model touches it.
import "temporal-polyfill/global";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

declare global {
	var __db: ReturnType<typeof postgres<Contract>> | undefined;
}

export const db =
	globalThis.__db ?? postgres<Contract>({ contractJson, url: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalThis.__db = db;
