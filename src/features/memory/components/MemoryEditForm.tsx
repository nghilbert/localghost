import { useEffect, useRef } from "react";
import { useAppForm } from "#/components/form/use-app-form";
import { Input } from "#/components/ui/input";
import { useUpdateMemory } from "#/features/memory/hooks/use-update-memory";

type MemoryEditFormProps = {
	memory: { id: string; text: string };
	/** Closes the editor, whether the edit happened or was cancelled. */
	onDone: () => void;
};

/** Inline editor for a saved memory's text: Enter or blur saves, Escape cancels. */
export function MemoryEditForm({ memory, onDone }: MemoryEditFormProps) {
	const updateMemory = useUpdateMemory();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.select();
	}, []);

	const form = useAppForm({
		defaultValues: { text: memory.text },
		onSubmit: ({ value }) => {
			const text = value.text.trim();
			if (text && text !== memory.text) {
				return updateMemory.mutateAsync({ id: memory.id, text }, { onSuccess: onDone });
			}
			onDone();
		},
	});

	return (
		<form.AppForm>
			<form.Form>
				<form.AppField name="text">
					{(field) => (
						<Input
							ref={inputRef}
							aria-label="Memory text"
							value={field.state.value}
							onValueChange={(value) => field.handleChange(value)}
							onBlur={() => form.handleSubmit()}
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
