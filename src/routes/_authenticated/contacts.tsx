import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Input } from "#/components/ui/input";
import { ContactRow } from "#/features/contacts/components/ContactRow";
import { CreateContactDialog } from "#/features/contacts/components/CreateContactDialog";
import { contactsQueryOptions, deleteContact } from "#/features/contacts/lib/contact.functions";
import type { Contact } from "#/features/contacts/lib/contact.types";
import type { ContactModel } from "#/generated/prisma/models";

export const Route = createFileRoute("/_authenticated/contacts")({
	component: ContactsPage,
});

function ContactsPage() {
	const queryClient = useQueryClient();
	const { data: rawContacts = [] } = useQuery(contactsQueryOptions());
	const [searchQuery, setSearchQuery] = useState("");

	const deleteMutation = useMutation({
		mutationFn: deleteContact,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
	});

	// Cast JSON array fields from the DB response to the typed Contact shape
	const contacts: Contact[] = (rawContacts as ContactModel[]).map((c) => ({
		...c,
		emails: c.emails as string[],
		phones: c.phones as string[],
	}));

	const q = searchQuery.toLowerCase();
	const filteredContacts = q
		? contacts.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.emails.some((e) => e.toLowerCase().includes(q)) ||
					c.phones.some((p) => p.includes(q)),
			)
		: contacts;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Contacts"
				description={`${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
				actions={
					<CreateContactDialog
						onCreated={() => queryClient.invalidateQueries({ queryKey: ["contacts"] })}
					/>
				}
			/>

			<div className="flex h-full min-h-0 flex-col">
				<div className="shrink-0 border-b px-4 py-2">
					<div className="relative">
						<SearchIcon
							size={14}
							className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search contacts…"
							className="pl-8"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-auto">
					{filteredContacts.length === 0 && (
						<div className="flex h-full items-center justify-center">
							<p className="text-sm text-muted-foreground">
								{searchQuery ? "No matching contacts." : "No contacts yet."}
							</p>
						</div>
					)}
					<ul className="divide-y">
						{filteredContacts.map((contact) => (
							<ContactRow
								key={contact.id}
								contact={contact}
								onDelete={() => deleteMutation.mutate({ data: { id: contact.id } })}
							/>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}
