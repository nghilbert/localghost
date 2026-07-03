import { useEffect, useRef } from "react";
import { Input } from "#/components/ui/input";
import { useConversations } from "#/features/chat/hooks/use-conversations";
import { useAppForm } from "#/hooks/use-app-form";

type ChatRenameFormProps = {
	conversation: { id: string; title: string };
	/** Closes the editor, whether the rename happened or was cancelled. */
	onDone: () => void;
};

/** Inline sidebar editor for a chat title: Enter or blur saves, Escape cancels. */
export function ChatRenameForm({ conversation, onDone }: ChatRenameFormProps) {
	const { renameConversation } = useConversations();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.select();
	}, []);

	const form = useAppForm({
		defaultValues: { title: conversation.title },
		onSubmit: async ({ value }) => {
			const title = value.title.trim();
			if (title && title !== conversation.title) {
				await renameConversation.mutate({ id: conversation.id, title });
			}
			onDone();
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppField name="title">
				{(field) => (
					<Input
						ref={inputRef}
						aria-label="Chat title"
						className="h-7"
						value={field.state.value}
						onChange={(event) => field.handleChange(event.target.value)}
						onBlur={() => form.handleSubmit()}
						onKeyDown={(event) => {
							if (event.key === "Escape") onDone();
						}}
					/>
				)}
			</form.AppField>
		</form>
	);
}
