import { revalidateLogic } from "@tanstack/react-form";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldGroup } from "#/components/ui/field";
import { useMcpServers } from "#/features/mcp/hooks/use-mcp-servers";
import {
	AddMcpServerFormSchema,
	addMcpServerDefaults,
	MCP_TRANSPORT_OPTIONS,
	toCreateMcpServerInput,
} from "#/features/mcp/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

type AddMcpServerFormProps = { onSuccess?: () => void };

export function AddMcpServerForm({ onSuccess }: AddMcpServerFormProps) {
	const { createServer } = useMcpServers();

	const form = useAppForm({
		defaultValues: addMcpServerDefaults,
		validators: { onDynamic: AddMcpServerFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createServer.mutate(toCreateMcpServerInput(value), {
				onSuccess: () => {
					formApi.reset();
					onSuccess?.();
				},
			});
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>New MCP server</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<FieldGroup className="gap-3">
							<form.AppField name="name">
								{(field) => <field.InputField label="Name" placeholder="My MCP server" />}
							</form.AppField>
							<form.AppField name="url">
								{(field) => (
									<field.InputField label="URL" placeholder="https://mcp.example.com/mcp" />
								)}
							</form.AppField>
							<form.AppField name="type">
								{(field) => (
									<field.ToggleGroupField label="Transport" options={MCP_TRANSPORT_OPTIONS} />
								)}
							</form.AppField>
							<form.FormError>{createServer.error?.message}</form.FormError>
							<Field orientation="horizontal">
								<form.SubmitButton size="sm">Add</form.SubmitButton>
							</Field>
						</FieldGroup>
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
