export type Contact = {
	id: string;
	name: string;
	/** Stored as JSON array in the DB; cast from `unknown`. */
	emails: string[];
	/** Stored as JSON array in the DB; cast from `unknown`. */
	phones: string[];
	notes: string | null;
};
