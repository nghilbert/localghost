import type { ComposedAuthoringHelpers } from "@prisma/orm-postgres/contract-builder";
import type sqlFamily from "@prisma/orm-postgres/family";
import type postgresPack from "@prisma/orm-postgres/target";

export type ContractHelpers = ComposedAuthoringHelpers<
	typeof sqlFamily,
	typeof postgresPack,
	undefined
>;
