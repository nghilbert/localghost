import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldError, FieldGroup } from "#/components/ui/field";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import {
	createToken,
	deleteToken,
	tokensQueryOptions,
} from "#/features/tokens/lib/token.functions";
import { useAppForm } from "#/hooks/use-app-form";

const TokenSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	expiresInDays: z.string().regex(/^\d*$/, "Must be a number of days"),
});

const TokenDefaults: z.infer<typeof TokenSchema> = {
	name: "",
	expiresInDays: "",
};

export function TokensTab() {
	const queryClient = useQueryClient();
	const { data: tokens = [] } = useQuery(tokensQueryOptions());
	const [newToken, setNewToken] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: TokenDefaults,
		validators: { onDynamic: TokenSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				const result = await createToken({
					data: {
						name: value.name.trim(),
						expiresInDays: value.expiresInDays ? Number(value.expiresInDays) : undefined,
					},
				});
				queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
				setNewToken(result.raw);
				toast.success("Token created");
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to create token");
			}
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteToken,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
			toast.success("Token revoked");
		},
		onError: (error) => toast.error(`Failed to revoke token: ${error.message}`),
	});

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				API tokens let you access the chat API programmatically. Tokens begin with{" "}
				<code className="rounded bg-muted px-1 py-0.5 text-xs">ody_</code>.
			</p>

			{newToken && (
				<Card className="border-primary/30 bg-primary/5">
					<CardContent className="space-y-1">
						<p className="text-xs font-medium text-primary">
							Token created — copy it now, it won't be shown again
						</p>
						<code className="block break-all text-xs">{newToken}</code>
						<Button
							size="sm"
							variant="outline"
							className="mt-1 h-6 px-2 text-xs"
							onClick={() => {
								navigator.clipboard.writeText(newToken);
								toast.success("Copied");
							}}
						>
							Copy
						</Button>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Create token</CardTitle>
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
									{(field) => <field.InputField label="Name" placeholder="Token name" />}
								</form.AppField>
								<form.AppField name="expiresInDays">
									{(field) => (
										<field.InputField
											label="Expires in days"
											description="Leave blank for a token that never expires"
											inputMode="numeric"
											placeholder="Never"
										/>
									)}
								</form.AppField>
								<FieldError>{formError}</FieldError>
								<Field orientation="horizontal">
									<form.SubmitButton size="sm">Create</form.SubmitButton>
								</Field>
							</FieldGroup>
						</form.AppForm>
					</form>
				</CardContent>
			</Card>

			{tokens.length === 0 ? (
				<p className="text-sm text-muted-foreground">No tokens yet.</p>
			) : (
				<ItemGroup>
					{tokens.map((t) => (
						<Item key={t.id} variant="outline">
							<ItemContent>
								<ItemTitle>{t.name}</ItemTitle>
								<ItemDescription>
									<code>{t.prefix}…</code>
									{t.expiresAt && ` · Expires ${new Date(t.expiresAt).toLocaleDateString()}`}
									{t.lastUsedAt && ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
									onClick={() => deleteMutation.mutate({ data: { id: t.id } })}
									aria-label="Revoke token"
								>
									<TrashIcon size={13} />
								</Button>
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			)}
		</div>
	);
}
