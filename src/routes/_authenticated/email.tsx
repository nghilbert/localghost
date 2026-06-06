import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftIcon, MailIcon, PencilIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { ComposeModal } from "#/features/email/components/ComposeModal";
import {
	createEmailAccount,
	emailAccountsQueryOptions,
	getEmail,
	listEmails,
} from "#/features/email/lib/email.functions";

export const Route = createFileRoute("/_authenticated/email")({
	component: EmailPage,
});

function EmailPage() {
	const queryClient = useQueryClient();
	const { data: accounts = [] } = useQuery(emailAccountsQueryOptions());
	const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(
		() => accounts[0]?.id,
	);
	const [selectedUid, setSelectedUid] = useState<string | undefined>();
	const [composeOpen, setComposeOpen] = useState(false);
	const [addAccountOpen, setAddAccountOpen] = useState(false);

	const activeAccountId = selectedAccountId ?? accounts[0]?.id;

	const {
		data: messages = [],
		refetch: refetchMessages,
		isFetching,
	} = useQuery({
		queryKey: ["emails", activeAccountId],
		queryFn: () =>
			activeAccountId
				? listEmails({ data: { accountId: activeAccountId, folder: "INBOX", limit: 50 } })
				: Promise.resolve([]),
		enabled: !!activeAccountId,
		staleTime: 60_000,
	});

	const { data: openMessage } = useQuery({
		queryKey: ["email-message", activeAccountId, selectedUid],
		queryFn: () =>
			activeAccountId && selectedUid
				? getEmail({ data: { accountId: activeAccountId, uid: selectedUid } })
				: Promise.resolve(null),
		enabled: !!activeAccountId && !!selectedUid,
	});

	if (accounts.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4">
				<MailIcon size={40} className="text-muted-foreground" />
				<p className="text-muted-foreground">No email accounts configured</p>
				<AddAccountDialog
					open={addAccountOpen}
					onOpenChange={setAddAccountOpen}
					onAdded={(id) => {
						queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
						setSelectedAccountId(id);
					}}
				/>
			</div>
		);
	}

	// On mobile: show message detail when one is selected; otherwise show list.
	const showDetail = !!selectedUid;

	return (
		<div className="flex h-full overflow-hidden">
			{/* Message list — hidden on mobile when a message is open */}
			<aside
				className={`flex flex-col border-r md:w-72 md:flex-shrink-0 ${showDetail ? "hidden md:flex" : "flex w-full"}`}
			>
				<div className="flex items-center gap-1 border-b px-3 py-2">
					<select
						className="min-w-0 flex-1 bg-transparent text-sm outline-none"
						value={activeAccountId}
						onChange={(e) => {
							setSelectedAccountId(e.target.value);
							setSelectedUid(undefined);
						}}
					>
						{accounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</select>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 shrink-0"
						onClick={() => refetchMessages()}
						disabled={isFetching}
						title="Refresh"
					>
						<RefreshCwIcon size={13} className={isFetching ? "animate-spin" : ""} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 shrink-0"
						onClick={() => setComposeOpen(true)}
						title="Compose"
					>
						<PencilIcon size={13} />
					</Button>
				</div>

				<ul className="flex-1 overflow-y-auto">
					{messages.length === 0 && !isFetching && (
						<li className="p-4 text-center text-xs text-muted-foreground">No messages</li>
					)}
					{messages.map((msg) => (
						<li key={msg.uid}>
							<button
								type="button"
								className={`w-full border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${selectedUid === msg.uid ? "bg-muted" : ""}`}
								onClick={() => setSelectedUid(msg.uid)}
							>
								<p className={`truncate text-sm ${!msg.seen ? "font-semibold" : ""}`}>{msg.from}</p>
								<p className="truncate text-xs text-muted-foreground">{msg.subject}</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{new Date(msg.date).toLocaleDateString()}
								</p>
							</button>
						</li>
					))}
				</ul>

				<div className="border-t p-2">
					<AddAccountDialog
						open={addAccountOpen}
						onOpenChange={setAddAccountOpen}
						onAdded={(id) => {
							queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
							setSelectedAccountId(id);
						}}
					/>
				</div>
			</aside>

			{/* Message read pane — full width on mobile when open */}
			<main
				className={`flex flex-1 flex-col overflow-hidden ${showDetail ? "flex" : "hidden md:flex"}`}
			>
				{openMessage ? (
					<div className="flex flex-1 flex-col overflow-auto">
						<div className="border-b px-4 py-3">
							{/* Back button on mobile */}
							<button
								type="button"
								className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground md:hidden"
								onClick={() => setSelectedUid(undefined)}
							>
								<ArrowLeftIcon size={13} />
								Inbox
							</button>
							<h2 className="text-base font-semibold">{openMessage.subject}</h2>
							<p className="text-sm text-muted-foreground">From: {openMessage.from}</p>
							<p className="text-sm text-muted-foreground">
								{new Date(openMessage.date).toLocaleString()}
							</p>
							<div className="mt-3">
								<Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}>
									Reply
								</Button>
							</div>
						</div>
						<div className="flex-1 overflow-auto px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap">
							{openMessage.text}
						</div>
					</div>
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">Select a message to read</p>
					</div>
				)}
			</main>

			{activeAccountId && (
				<ComposeModal
					accountId={activeAccountId}
					open={composeOpen}
					onOpenChange={setComposeOpen}
					replyTo={openMessage ? { to: openMessage.from, subject: openMessage.subject } : undefined}
				/>
			)}
		</div>
	);
}

type AddAccountDialogProps = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onAdded: (id: string) => void;
};

function AddAccountDialog({ open, onOpenChange, onAdded }: AddAccountDialogProps) {
	const [form, setForm] = useState({
		name: "",
		fromAddress: "",
		imapHost: "",
		imapPort: "993",
		imapUser: "",
		imapPassword: "",
		smtpHost: "",
		smtpPort: "465",
		smtpSecurity: "ssl",
		smtpUser: "",
		smtpPassword: "",
	});

	const addMut = useMutation({
		mutationFn: () =>
			createEmailAccount({
				data: {
					name: form.name,
					fromAddress: form.fromAddress,
					imapHost: form.imapHost,
					imapPort: Number(form.imapPort),
					imapUser: form.imapUser,
					imapPassword: form.imapPassword,
					smtpHost: form.smtpHost,
					smtpPort: Number(form.smtpPort),
					smtpSecurity: form.smtpSecurity as "ssl" | "starttls" | "none",
					smtpUser: form.smtpUser,
					smtpPassword: form.smtpPassword,
				},
			}),
		onSuccess: (account) => {
			onAdded(account.id);
			onOpenChange(false);
		},
	});

	function field(key: keyof typeof form, label: string, type = "text") {
		const id = `email-field-${key}`;
		return (
			<div className="flex flex-col gap-1">
				<label htmlFor={id} className="text-xs text-muted-foreground">
					{label}
				</label>
				<Input
					id={id}
					type={type}
					value={form[key]}
					onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
					className="h-8 text-sm"
				/>
			</div>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="w-full text-xs">
					+ Add account
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Add Email Account</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-3">
					{field("name", "Account name")}
					{field("fromAddress", "From address")}
					<p className="col-span-2 text-xs font-medium text-muted-foreground">IMAP (incoming)</p>
					{field("imapHost", "Host")}
					{field("imapPort", "Port")}
					{field("imapUser", "Username")}
					{field("imapPassword", "Password", "password")}
					<p className="col-span-2 text-xs font-medium text-muted-foreground">SMTP (outgoing)</p>
					{field("smtpHost", "Host")}
					{field("smtpPort", "Port")}
					{field("smtpUser", "Username (leave blank = same as IMAP)")}
					{field("smtpPassword", "Password (leave blank = same as IMAP)", "password")}
				</div>
				<div className="flex justify-end">
					<Button
						onClick={() => addMut.mutate()}
						disabled={!form.name || !form.imapHost || addMut.isPending}
					>
						{addMut.isPending ? "Adding…" : "Add Account"}
					</Button>
				</div>
				{addMut.isError && (
					<p className="text-sm text-destructive">{(addMut.error as Error).message}</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
