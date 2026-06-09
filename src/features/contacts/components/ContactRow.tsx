import { MailIcon, PhoneIcon, Trash2Icon, UserIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import type { Contact } from "#/features/contacts/lib/contact.types";

type ContactRowProps = {
	contact: Contact;
	onDelete: () => void;
};

export function ContactRow({ contact, onDelete }: ContactRowProps) {
	return (
		<li className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
			<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<UserIcon size={15} className="text-primary" />
			</div>

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{contact.name}</p>
				<div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
					{contact.emails.slice(0, 2).map((email) => (
						<a
							key={email}
							href={`mailto:${email}`}
							className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
							onClick={(e) => e.stopPropagation()}
						>
							<MailIcon size={10} />
							{email}
						</a>
					))}
					{contact.phones.slice(0, 2).map((phone) => (
						<a
							key={phone}
							href={`tel:${phone}`}
							className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
							onClick={(e) => e.stopPropagation()}
						>
							<PhoneIcon size={10} />
							{phone}
						</a>
					))}
				</div>
			</div>

			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
				onClick={onDelete}
				aria-label="Delete contact"
			>
				<Trash2Icon size={13} className="text-destructive" />
			</Button>
		</li>
	);
}
