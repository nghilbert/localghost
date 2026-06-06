import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MailIcon, PhoneIcon, PlusIcon, SearchIcon, Trash2Icon, UserIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import {
	contactsQueryOptions,
	createContact,
	deleteContact,
} from "#/features/contacts/lib/contact.functions";

export const Route = createFileRoute("/_authenticated/contacts")({
	component: ContactsPage,
});

type Contact = {
	id: string;
	name: string;
	emails: unknown;
	phones: unknown;
	notes: string | null;
};

function ContactsPage() {
	const queryClient = useQueryClient();
	const { data: contacts = [] } = useQuery(contactsQueryOptions());
	const [search, setSearch] = useState("");
	const [createOpen, setCreateOpen] = useState(false);

	const deleteMut = useMutation({
		mutationFn: deleteContact,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
	});

	const q = search.toLowerCase();
	const filtered = q
		? contacts.filter((c) => {
				if (c.name.toLowerCase().includes(q)) return true;
				const emails = c.emails as string[];
				const phones = c.phones as string[];
				return emails.some((e) => e.toLowerCase().includes(q)) || phones.some((p) => p.includes(q));
			})
		: contacts;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Contacts"
				description={`${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
				actions={
					<CreateContactDialog
						open={createOpen}
						onOpenChange={setCreateOpen}
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
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search contacts…"
							className="pl-8"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-auto">
					{filtered.length === 0 && (
						<div className="flex h-full items-center justify-center">
							<p className="text-sm text-muted-foreground">
								{search ? "No matching contacts." : "No contacts yet."}
							</p>
						</div>
					)}
					<ul className="divide-y">
						{filtered.map((contact) => (
							<ContactRow
								key={contact.id}
								contact={contact}
								onDelete={() => deleteMut.mutate({ data: { id: contact.id } })}
							/>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}

function ContactRow({ contact, onDelete }: { contact: Contact; onDelete: () => void }) {
	const emails = contact.emails as string[];
	const phones = contact.phones as string[];

	return (
		<li className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
			<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<UserIcon size={15} className="text-primary" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{contact.name}</p>
				<div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
					{emails.slice(0, 2).map((e) => (
						<a
							key={e}
							href={`mailto:${e}`}
							className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
							onClick={(ev) => ev.stopPropagation()}
						>
							<MailIcon size={10} />
							{e}
						</a>
					))}
					{phones.slice(0, 2).map((p) => (
						<a
							key={p}
							href={`tel:${p}`}
							className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
							onClick={(ev) => ev.stopPropagation()}
						>
							<PhoneIcon size={10} />
							{p}
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

function CreateContactDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onCreated: () => void;
}) {
	const [name, setName] = useState("");
	const [emailStr, setEmailStr] = useState("");
	const [phoneStr, setPhoneStr] = useState("");
	const [notes, setNotes] = useState("");

	const createMut = useMutation({
		mutationFn: createContact,
		onSuccess: () => {
			onCreated();
			onOpenChange(false);
			setName("");
			setEmailStr("");
			setPhoneStr("");
			setNotes("");
		},
	});

	function handleCreate() {
		const emails = emailStr
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const phones = phoneStr
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		createMut.mutate({ data: { name, emails, phones, notes: notes || undefined } });
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-1.5">
					<PlusIcon size={13} />
					New contact
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>New Contact</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Input
						placeholder="Name *"
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoFocus
					/>
					<Input
						placeholder="Email(s), comma-separated"
						value={emailStr}
						onChange={(e) => setEmailStr(e.target.value)}
					/>
					<Input
						placeholder="Phone(s), comma-separated"
						value={phoneStr}
						onChange={(e) => setPhoneStr(e.target.value)}
					/>
					<textarea
						placeholder="Notes (optional)"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						rows={2}
						className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
					/>
					<Button onClick={handleCreate} disabled={!name.trim() || createMut.isPending}>
						{createMut.isPending ? "Creating…" : "Create contact"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
