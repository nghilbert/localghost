import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MailIcon } from "lucide-react";
import { useState } from "react";
import { AddAccountDialog } from "#/features/email/components/AddAccountDialog";
import { ComposeModal } from "#/features/email/components/ComposeModal";
import { EmailMessageList } from "#/features/email/components/EmailMessageList";
import { EmailMessageReader } from "#/features/email/components/EmailMessageReader";
import {
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
	const [isComposeOpen, setIsComposeOpen] = useState(false);

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

	function handleAccountAdded(id: string) {
		queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
		setSelectedAccountId(id);
	}

	if (accounts.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4">
				<MailIcon size={40} className="text-muted-foreground" />
				<p className="text-muted-foreground">No email accounts configured</p>
				<AddAccountDialog onAdded={handleAccountAdded} />
			</div>
		);
	}

	const isDetailVisible = !!selectedUid;

	return (
		<div className="flex h-full overflow-hidden">
			<EmailMessageList
				accounts={accounts}
				activeAccountId={activeAccountId}
				messages={messages}
				isFetching={isFetching}
				selectedUid={selectedUid}
				isDetailVisible={isDetailVisible}
				onAccountChange={(id) => {
					setSelectedAccountId(id);
					setSelectedUid(undefined);
				}}
				onSelectMessage={setSelectedUid}
				onRefresh={() => refetchMessages()}
				onCompose={() => setIsComposeOpen(true)}
				onAccountAdded={handleAccountAdded}
			/>

			<main
				className={`flex flex-1 flex-col overflow-hidden ${isDetailVisible ? "flex" : "hidden md:flex"}`}
			>
				{openMessage ? (
					<EmailMessageReader
						message={openMessage}
						onBack={() => setSelectedUid(undefined)}
						onReply={() => setIsComposeOpen(true)}
					/>
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">Select a message to read</p>
					</div>
				)}
			</main>

			{activeAccountId && (
				<ComposeModal
					accountId={activeAccountId}
					open={isComposeOpen}
					onOpenChange={setIsComposeOpen}
					replyTo={openMessage ? { to: openMessage.from, subject: openMessage.subject } : undefined}
				/>
			)}
		</div>
	);
}
