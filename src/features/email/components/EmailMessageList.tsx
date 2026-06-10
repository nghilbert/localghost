import { PencilIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { NativeSelect, NativeSelectOption } from "#/components/ui/native-select";
import { AddAccountDialog } from "#/features/email/components/AddAccountDialog";
import type { EmailAccount, EmailMessage } from "#/features/email/lib/types";

type EmailMessageListProps = {
	accounts: EmailAccount[];
	activeAccountId: string | undefined;
	messages: EmailMessage[];
	isFetching: boolean;
	selectedUid: string | undefined;
	/** True when a message is open; hides the list on mobile */
	isDetailVisible: boolean;
	onAccountChange: (id: string) => void;
	onSelectMessage: (uid: string) => void;
	onRefresh: () => void;
	onCompose: () => void;
	onAccountAdded: (id: string) => void;
};

export function EmailMessageList({
	accounts,
	activeAccountId,
	messages,
	isFetching,
	selectedUid,
	isDetailVisible,
	onAccountChange,
	onSelectMessage,
	onRefresh,
	onCompose,
	onAccountAdded,
}: EmailMessageListProps) {
	return (
		<aside
			className={`flex flex-col border-r md:w-72 md:flex-shrink-0 ${isDetailVisible ? "hidden md:flex" : "flex w-full"}`}
		>
			<div className="flex items-center gap-1 border-b px-3 py-2">
				<NativeSelect
					className="min-w-0 flex-1"
					value={activeAccountId}
					onChange={(e) => onAccountChange(e.target.value)}
				>
					{accounts.map((a) => (
						<NativeSelectOption key={a.id} value={a.id}>
							{a.name}
						</NativeSelectOption>
					))}
				</NativeSelect>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={onRefresh}
					disabled={isFetching}
					title="Refresh"
				>
					<RefreshCwIcon size={13} className={isFetching ? "animate-spin" : ""} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={onCompose}
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
						<Button
							variant="ghost"
							className={`h-auto w-full justify-start rounded-none border-b px-3 py-2.5 text-left ${selectedUid === msg.uid ? "bg-muted" : ""}`}
							onClick={() => onSelectMessage(msg.uid)}
						>
							<p className={`truncate text-sm ${!msg.seen ? "font-semibold" : ""}`}>{msg.from}</p>
							<p className="truncate text-xs text-muted-foreground">{msg.subject}</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{new Date(msg.date).toLocaleDateString()}
							</p>
						</Button>
					</li>
				))}
			</ul>

			<div className="border-t p-2">
				<AddAccountDialog onAdded={onAccountAdded} />
			</div>
		</aside>
	);
}
