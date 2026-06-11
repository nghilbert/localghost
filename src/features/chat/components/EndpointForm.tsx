import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { FieldError, FieldGroup } from "#/components/ui/field";
import { createEndpoint } from "#/features/chat/lib/chat.functions";
import { useAppForm } from "#/hooks/use-app-form";

const PROVIDER_OPTIONS = [
	{ value: "openai", label: "OpenAI-compatible" },
	{ value: "anthropic", label: "Anthropic" },
	{ value: "ollama", label: "Ollama" },
	{ value: "openrouter", label: "OpenRouter" },
	{ value: "groq", label: "Groq" },
];

const EndpointSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
	url: z.url("Must be a valid URL").max(2048),
	apiKey: z.string(),
	provider: z.enum(["openai", "anthropic", "ollama", "openrouter", "groq"]),
});

const EndpointDefaults: z.infer<typeof EndpointSchema> = {
	name: "",
	url: "",
	apiKey: "",
	provider: "openai",
};

type EndpointFormProps = {
	onCreated?: () => void;
};

/** Add-provider form shared by the providers dialog, onboarding, and Settings → Setup. */
export function EndpointForm({ onCreated }: EndpointFormProps) {
	const [formError, setFormError] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const form = useAppForm({
		defaultValues: EndpointDefaults,
		validators: { onDynamic: EndpointSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await createEndpoint({
					data: {
						name: value.name.trim(),
						url: value.url.trim(),
						apiKey: value.apiKey || undefined,
						provider: value.provider,
					},
				});
				queryClient.invalidateQueries({ queryKey: ["endpoints"] });
				toast.success("Provider added");
				formApi.reset();
				onCreated?.();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to add provider");
			}
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldGroup className="gap-3">
					<div className="grid grid-cols-2 gap-3">
						<form.AppField name="name">
							{(field) => <field.InputField label="Name" placeholder="My Ollama" />}
						</form.AppField>
						<form.AppField name="provider">
							{(field) => <field.SelectField label="Provider" options={PROVIDER_OPTIONS} />}
						</form.AppField>
					</div>
					<form.AppField name="url">
						{(field) => <field.InputField label="Base URL" placeholder="http://localhost:11434" />}
					</form.AppField>
					<form.AppField name="apiKey">
						{(field) => <field.PasswordField label="API Key (optional)" placeholder="sk-…" />}
					</form.AppField>
					<FieldError>{formError}</FieldError>
					<form.SubmitButton className="w-full gap-1.5">
						<PlusIcon size={14} />
						Add provider
					</form.SubmitButton>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
