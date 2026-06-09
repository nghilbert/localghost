import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	createToken,
	deleteToken,
	tokensQueryOptions,
} from "#/features/tokens/lib/token.functions";

export function TokensTab() {
	const queryClient = useQueryClient();
	const { data: tokens = [] } = useQuery(tokensQueryOptions());
	const [name, setName] = useState("");
	const [expiresInDays, setExpiresInDays] = useState<string>("");
	const [newToken, setNewToken] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: createToken,
		onSuccess: (res) => {
			queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
			setNewToken(res.raw);
			setName("");
			setExpiresInDays("");
			setError(null);
		},
		onError: (e) => setError((e as Error).message),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteToken,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-tokens"] }),
	});

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				API tokens let you access the chat API programmatically. Tokens begin with{" "}
				<code className="rounded bg-muted px-1 py-0.5 text-xs">ody_</code>.
			</p>

			{newToken && (
				<div className="space-y-1 rounded-lg border border-primary/30 bg-primary/5 p-3">
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
				</div>
			)}

			<div className="space-y-2 rounded-lg border p-4">
				<h3 className="text-sm font-medium">Create token</h3>
				{error && <p className="text-xs text-destructive">{error}</p>}
				<div className="flex gap-2">
					<Input
						placeholder="Token name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="flex-1"
					/>
					<Input
						placeholder="Expires in days"
						type="number"
						value={expiresInDays}
						onChange={(e) => setExpiresInDays(e.target.value)}
						className="w-36"
					/>
					<Button
						size="sm"
						disabled={!name.trim() || createMutation.isPending}
						onClick={() =>
							createMutation.mutate({
								data: {
									name,
									expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
								},
							})
						}
					>
						{createMutation.isPending ? "Creating…" : "Create"}
					</Button>
				</div>
			</div>

			{tokens.length === 0 ? (
				<p className="text-sm text-muted-foreground">No tokens yet.</p>
			) : (
				<div className="space-y-2">
					{tokens.map((t) => (
						<div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium">{t.name}</p>
								<p className="text-xs text-muted-foreground">
									<code>{t.prefix}…</code>
									{t.expiresAt && ` · Expires ${new Date(t.expiresAt).toLocaleDateString()}`}
									{t.lastUsedAt && ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
								onClick={() => deleteMutation.mutate({ data: { id: t.id } })}
								aria-label="Revoke token"
							>
								<TrashIcon size={13} />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
