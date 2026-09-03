import type { CleanedWhere } from "better-auth/adapters";
import { createAdapterFactory } from "better-auth/adapters";
import { Temporal } from "temporal-polyfill";
import { db } from "#/prisma/db";

/** better-auth's database adapter, driven by Prisma Next, via
 * `createAdapterFactory` rather than `better-auth/adapters/prisma` (which
 * expects a classic `PrismaClient`). ORM lane only, never `db.sql` (its
 * insert/returning paths have real bugs). No public OR combinator on
 * `db.orm`, so `buildWhere` throws rather than silently over-matching. */

type Row = Record<string, unknown>;

// better-auth generates its own createdAt/updatedAt/expiresAt as native Date
// (its schema has no notion of our Temporal columns): convert Date to
// Temporal.PlainDateTime going in, and back going out, so the rest of the
// app never sees a Temporal value from an auth table.
function toWriteValue(value: unknown): unknown {
	return value instanceof Date
		? Temporal.PlainDateTime.from({
				year: value.getUTCFullYear(),
				month: value.getUTCMonth() + 1,
				day: value.getUTCDate(),
				hour: value.getUTCHours(),
				minute: value.getUTCMinutes(),
				second: value.getUTCSeconds(),
				millisecond: value.getUTCMilliseconds(),
			})
		: value;
}

function toReadValue(value: unknown): unknown {
	return value instanceof Temporal.PlainDateTime
		? new Date(
				Date.UTC(
					value.year,
					value.month - 1,
					value.day,
					value.hour,
					value.minute,
					value.second,
					value.millisecond,
				),
			)
		: value;
}

function mapValues(row: Row, fn: (value: unknown) => unknown): Row {
	return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, fn(value)]));
}

// Each comparison/order/pattern method is optional: a Temporal or boolean
// field's real proxy has no `like`/`ilike`, a boolean's has no `lt`/`gt`, etc.
// The operators a field actually supports vary by its underlying codec.
type FieldOps = {
	eq?(value: unknown): unknown;
	neq?(value: unknown): unknown;
	lt?(value: unknown): unknown;
	lte?(value: unknown): unknown;
	gt?(value: unknown): unknown;
	gte?(value: unknown): unknown;
	in?(value: unknown): unknown;
	like?(pattern: string): unknown;
	ilike?(pattern: string): unknown;
	desc?(): unknown;
	asc?(): unknown;
};
// A relation field (e.g. `Session.user`) sits alongside scalar fields on the
// same proxy object but exposes a structurally unrelated filter API
// (`.some()`/`.none()`, not `.eq()`); better-auth's own `where` clauses only
// ever target scalar fields, so the index signature stays permissive here
// and each accessor above is optional-chained rather than assumed present.
type FieldProxy = Record<string, FieldOps | undefined>;

/** Every model's `db.orm.public.<Model>` collection, checked against this
 * hand-written surface: the real type is a union of four structurally
 * different generics, and TS can't call a method across that union. */
interface AdapterCollection {
	where(fn: (f: FieldProxy) => unknown): AdapterCollection;
	select(...columns: string[]): AdapterCollection;
	offset(n: number): AdapterCollection;
	limit(n: number): AdapterCollection;
	first(): Promise<Row | null>;
	all(): PromiseLike<Row[]>;
	create(data: Row): Promise<Row>;
	update(data: Row): Promise<Row | null>;
	delete(): Promise<void>;
	deleteAndCount(): Promise<number>;
	aggregate(fn: (a: { count(): number }) => { total: number }): Promise<{ total: number }>;
}

// better-auth model names are already the physical (lowercase) table name.
// `db.orm.public.<Model>`'s real type is a distinct generic per model;
// `AdapterCollection` is the narrowed common surface this adapter uses, so
// bridging the two needs one explicit assertion here rather than four
// structurally distinct generics each satisfying one shared interface.
function ormModelFor(model: string): AdapterCollection {
	switch (model) {
		case "user":
			return db.orm.public.User as unknown as AdapterCollection;
		case "session":
			return db.orm.public.Session as unknown as AdapterCollection;
		case "account":
			return db.orm.public.Account as unknown as AdapterCollection;
		case "verification":
			return db.orm.public.Verification as unknown as AdapterCollection;
		default:
			throw new Error(`prisma-next-adapter: no model mapped for "${model}"`);
	}
}

/** Applies one condition's field/operator/value to a query via the field-proxy lambda form. */
function applyCondition(query: AdapterCollection, condition: CleanedWhere): AdapterCollection {
	const { field, value, operator, mode } = condition;
	const insensitive = mode === "insensitive";
	switch (operator) {
		case "eq":
			return query.where((f) => f[field]?.eq?.(value));
		case "ne":
			return query.where((f) => f[field]?.neq?.(value));
		case "lt":
			return query.where((f) => f[field]?.lt?.(value));
		case "lte":
			return query.where((f) => f[field]?.lte?.(value));
		case "gt":
			return query.where((f) => f[field]?.gt?.(value));
		case "gte":
			return query.where((f) => f[field]?.gte?.(value));
		case "in":
			return query.where((f) => f[field]?.in?.(value));
		case "contains":
			return query.where((f) =>
				insensitive ? f[field]?.ilike?.(`%${value}%`) : f[field]?.like?.(`%${value}%`),
			);
		case "starts_with":
			return query.where((f) =>
				insensitive ? f[field]?.ilike?.(`${value}%`) : f[field]?.like?.(`${value}%`),
			);
		case "ends_with":
			return query.where((f) =>
				insensitive ? f[field]?.ilike?.(`%${value}`) : f[field]?.like?.(`%${value}`),
			);
		default:
			throw new Error(
				`prisma-next-adapter: operator "${operator}" has no public ORM equivalent (no "not" combinator on the public façade)`,
			);
	}
}

/** Applies a better-auth `where` array to a query. AND-only: throws on any OR connector. */
function buildWhere(
	query: AdapterCollection,
	where: CleanedWhere[] | undefined,
): AdapterCollection {
	if (!where || where.length === 0) return query;
	if (where.some((condition) => condition.connector === "OR")) {
		throw new Error(
			"prisma-next-adapter: OR-connector where clauses aren't supported (db.orm has no public OR combinator)",
		);
	}
	return where.reduce(applyCondition, query);
}

/** Deletes the row `id.eq` matches. Shared by `consumeOne`/`incrementOne`'s by-id follow-up. */
function deleteById(model: string, id: unknown): Promise<void> {
	return ormModelFor(model)
		.where((f) => f.id?.eq?.(id))
		.delete();
}

export const prismaNextAdapter = () =>
	createAdapterFactory({
		config: {
			adapterId: "prisma-next-adapter",
			adapterName: "Prisma Next Adapter",
			supportsNumericIds: false,
			supportsUUIDs: true,
			supportsJSON: true,
			supportsDates: true,
			supportsBooleans: true,
		},
		// Every method below returns an unconstrained generic T per better-auth's
		// CustomAdapter SPI (the caller decides the row shape, not the adapter).
		// Nothing here can prove our Row values are that T; the one assertion per
		// method is that boundary, not a shortcut around typing we control.
		adapter: () => ({
			async create<T extends Row>({ model, data }: { model: string; data: T }) {
				const row = await ormModelFor(model).create(mapValues(data, toWriteValue));
				return mapValues(row, toReadValue) as unknown as T;
			},
			async findOne<T>({
				model,
				where,
				select,
			}: {
				model: string;
				where: CleanedWhere[];
				select?: string[];
			}) {
				let query = buildWhere(ormModelFor(model), where);
				if (select) query = query.select(...select);
				const row = await query.first();
				return (row ? mapValues(row, toReadValue) : null) as unknown as T | null;
			},
			// `sortBy` isn't applied: `.orderBy(...)` needs the library's own branded
			// `OrderByItem` return type, which `AdapterCollection` can't express
			// without reintroducing the union-of-generics problem it exists to
			// avoid. This app's core email/password flow never sends `sortBy`.
			async findMany<T>({
				model,
				where,
				limit,
				offset,
			}: {
				model: string;
				where?: CleanedWhere[];
				limit: number;
				offset?: number;
			}) {
				let query = buildWhere(ormModelFor(model), where);
				if (offset) query = query.offset(offset);
				query = query.limit(limit ?? 100);
				const rows = await query.all();
				return rows.map((row) => mapValues(row, toReadValue)) as unknown as T[];
			},
			async count({ model, where }: { model: string; where?: CleanedWhere[] }) {
				const query = buildWhere(ormModelFor(model), where);
				const { total } = await query.aggregate((a) => ({ total: a.count() }));
				return total;
			},
			async update<T>({
				model,
				where,
				update,
			}: {
				model: string;
				where: CleanedWhere[];
				update: T;
			}) {
				const query = buildWhere(ormModelFor(model), where);
				const row = await query.update(mapValues(update as Row, toWriteValue));
				return (row ? mapValues(row, toReadValue) : null) as unknown as T | null;
			},
			async updateMany({
				model,
				where,
				update,
			}: {
				model: string;
				where: CleanedWhere[];
				update: Record<string, unknown>;
			}) {
				const query = buildWhere(ormModelFor(model), where);
				const row = await query.update(mapValues(update, toWriteValue));
				return row ? 1 : 0;
			},
			async delete({ model, where }: { model: string; where: CleanedWhere[] }) {
				const query = buildWhere(ormModelFor(model), where);
				await query.delete();
			},
			async deleteMany({ model, where }: { model: string; where: CleanedWhere[] }) {
				const query = buildWhere(ormModelFor(model), where);
				return query.deleteAndCount();
			},
			async consumeOne<T>({ model, where }: { model: string; where: CleanedWhere[] }) {
				// No single-statement atomic delete-and-return on the public ORM façade;
				// read then delete-by-id. A race only means two callers could both read
				// the row before either deletes it; the delete itself is still exactly-once.
				const query = buildWhere(ormModelFor(model), where);
				const row = await query.first();
				if (!row) return null;
				await deleteById(model, row.id);
				return mapValues(row, toReadValue) as unknown as T;
			},
			async incrementOne<T>({
				model,
				where,
				increment,
				set,
			}: {
				model: string;
				where: CleanedWhere[];
				increment: Record<string, number>;
				set?: Record<string, unknown>;
			}) {
				const query = buildWhere(ormModelFor(model), where);
				const row = await query.first();
				if (!row) return null;
				const data: Row = mapValues(set ?? {}, toWriteValue);
				for (const [field, delta] of Object.entries(increment)) {
					data[field] = (Number(row[field]) || 0) + delta;
				}
				const updated = await ormModelFor(model)
					.where((f) => f.id?.eq?.(row.id))
					.update(data);
				return (updated ? mapValues(updated, toReadValue) : null) as unknown as T | null;
			},
		}),
	});
