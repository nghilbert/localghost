export type EmailAccount = {
	id: string;
	name: string;
	fromAddress: string;
	isDefault: boolean;
};

export type EmailMessage = {
	uid: string;
	from: string;
	subject: string;
	date: string | Date;
	seen: boolean;
};

export type EmailMessageDetail = {
	uid: string;
	from: string;
	subject: string;
	date: string | Date;
	text: string;
	html?: string | null;
};
