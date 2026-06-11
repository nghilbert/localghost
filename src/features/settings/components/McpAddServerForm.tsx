import { revalidateLogic } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { FieldError, FieldGroup } from "#/components/ui/field";
import { createMcpServer } from "#/features/mcp/lib/mcp.functions";
import { useAppForm } from "#/hooks/use-app-form";

const TYPE_OPTIONS = [
	{ value: "streamable-http", label: "streamable-http" },
	{ value: "sse", label: "sse" },
];

const McpServerSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
	url: z.url("Must be a valid URL").max(2048),
	type: z.enum(["streamable-http", "sse"]),
});

const McpServerDefaults: z.infer<typeof McpServerSchema> = {
	name: "",
	url: "",
	type: "streamable-http",
};

type McpAddServerFormProps = {
	onCreated: () => void;
};

export function McpAddServerForm({ onCreated }: McpAddServerFormProps) {
	const queryClient = useQueryClient();
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: McpServerDefaults,
		validators: { onDynamic: McpServerSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await createMcpServer({
					data: { name: value.name.trim(), url: value.url.trim(), type: value.type },
				});
				queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
				toast.success("MCP server added");
				formApi.reset();
				onCreated();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to add MCP server");
			}
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
								{(field) => <field.ToggleGroupField label="Transport" options={TYPE_OPTIONS} />}
							</form.AppField>
							<FieldError>{formError}</FieldError>
							<form.SubmitButton size="sm" className="w-fit">
								Add
							</form.SubmitButton>
						</FieldGroup>
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
