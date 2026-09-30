/**
 * Field errors only the server can detect, such as a wrong current password. The form
 * kit's `Form` shows each message inline on its field.
 */
export class FieldErrors extends Error {
	fields: Record<string, string>;

	constructor(fields: Record<string, string>) {
		super("Field validation failed");
		this.name = "FieldErrors";
		this.fields = fields;
	}
}
