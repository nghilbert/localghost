import { useEffect, useRef } from "react";
import { Input } from "#/shared/components/ui/input";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { useMemories } from "../-hooks/use-memories";

type MemoryEditFormProps = {
	memory: { id: string; text: string };
	/** Closes the editor, whether the edit happened or was cancelled. */
	onDone: () => void;
};

/** Inline editor for a saved memory's text: Enter or blur saves, Escape cancels. */
export function MemoryEditForm({ memory, onDone }: MemoryEditFormProps) {
	const { updateMemoryMutation } = useMemories();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.select();
	}, []);

	const form = useAppForm({
		defaultValues: { text: memory.text },
		onSubmit: async ({ value }) => {
			const text = value.text.trim();
			if (text && text !== memory.text) {
				await updateMemoryMutation.mutate({ id: memory.id, text });
			}
			onDone();
		},
	});

	return (
		<form
			className="flex-1"
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppField name="text">
				{(field) => (
					<Input
						ref={inputRef}
						aria-label="Memory text"
						data-testid="memory-edit-input"
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
