import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, ServerIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { FieldError, FieldGroup, FieldLegend, FieldSet } from "#/components/ui/field";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import { Separator } from "#/components/ui/separator";
import {
	createEndpoint,
	deleteEndpoint,
	endpointsQueryOptions,
} from "#/features/chat/lib/chat.functions";
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

export function EndpointDialog() {
	const [open, setOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const queryClient = useQueryClient();
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

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
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to add provider");
			}
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.success("Provider deleted");
		},
		onError: (error) => toast.error(`Failed to delete provider: ${error.message}`),
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-1.5">
					<ServerIcon size={14} />
					Providers
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Model Providers</DialogTitle>
					<DialogDescription>
						Add LLM provider endpoints. API keys are encrypted at rest.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{endpoints.length > 0 && (
						<ItemGroup>
							{endpoints.map((ep) => (
								<Item key={ep.id} variant="outline">
									<ItemContent>
										<ItemTitle>{ep.name}</ItemTitle>
										<ItemDescription>{ep.url}</ItemDescription>
									</ItemContent>
									<ItemActions>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => deleteMutation.mutate(ep.id)}
											aria-label="Delete provider"
										>
											<Trash2Icon size={14} />
										</Button>
									</ItemActions>
								</Item>
							))}
						</ItemGroup>
					)}

					<Separator />

					<form
						onSubmit={(event) => {
							event.preventDefault();
							form.handleSubmit();
						}}
					>
						<form.AppForm>
							<FieldSet>
								<FieldLegend>Add provider</FieldLegend>
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
										{(field) => (
											<field.InputField label="Base URL" placeholder="http://localhost:11434" />
										)}
									</form.AppField>
									<form.AppField name="apiKey">
										{(field) => (
											<field.PasswordField label="API Key (optional)" placeholder="sk-…" />
										)}
									</form.AppField>
									<FieldError>{formError}</FieldError>
									<form.SubmitButton className="w-full gap-1.5">
										<PlusIcon size={14} />
										Add provider
									</form.SubmitButton>
								</FieldGroup>
							</FieldSet>
						</form.AppForm>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
