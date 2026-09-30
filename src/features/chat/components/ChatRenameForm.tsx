import { useAppForm } from "#/components/form/use-app-form";
import { Input } from "#/components/ui/input";
import { useRenameConversation } from "#/features/chat/hooks/use-rename-conversation";

type ChatRenameFormProps = {
	conversation: { id: string; title: string };
	/** Closes the editor, whether the rename happened or was cancelled. */
	onDone: () => void;
};

/** Inline sidebar editor for a chat title: Enter or blur saves, Escape cancels. */
export function ChatRenameForm({ conversation, onDone }: ChatRenameFormProps) {
	const renameConversation = useRenameConversation();
	const form = useAppForm({
		defaultValues: { title: conversation.title },
		onSubmit: ({ value }) => {
			const title = value.title.trim();
			if (title && title !== conversation.title) {
				return renameConversation.mutateAsync(
					{ id: conversation.id, title },
					{ onSuccess: onDone },
				);
			}
			onDone();
		},
	});

	return (
		<form.AppForm>
			<form.Form>
				<form.AppField name="title">
					{(field) => (
						<Input
							aria-label="Chat title"
							size="sm"
							// Opens with the title selected, ready to type over.
							autoFocus
							onFocus={(event) => event.currentTarget.select()}
							value={field.state.value}
							onValueChange={field.handleChange}
							onBlur={() => void form.handleSubmit().catch(() => undefined)}
							onKeyDown={(event) => {
								if (event.key === "Escape") onDone();
							}}
						/>
					)}
				</form.AppField>
			</form.Form>
		</form.AppForm>
	);
}
