import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { authClient } from "#/features/auth/lib/auth-client";

export function AccountTab() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });

	const [name, setName] = useState(user?.name ?? "");

	const updateMutation = useMutation({
		mutationFn: () => authClient.updateUser({ name }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session"] });
			toast.success("Profile updated");
		},
		onError: () => toast.error("Failed to update profile"),
	});

	const signOutMutation = useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: () => navigate({ to: "/sign-in" }),
	});

	return (
		<div className="space-y-4">
			<div className="space-y-3 rounded-lg border p-4">
				<h2 className="text-sm font-medium">Profile</h2>
				<div className="flex flex-col gap-1">
					<label htmlFor="settings-name" className="text-xs text-muted-foreground">
						Name
					</label>
					<div className="flex gap-2">
						<Input
							id="settings-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="max-w-xs"
						/>
						<Button
							onClick={() => updateMutation.mutate()}
							disabled={!name.trim() || name === user?.name || updateMutation.isPending}
							size="sm"
						>
							{updateMutation.isPending ? "Saving…" : "Save"}
						</Button>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">Email</span>
					<span className="text-sm">{user?.email}</span>
				</div>
			</div>

			<div className="rounded-lg border p-4">
				<h2 className="mb-3 text-sm font-medium">Session</h2>
				<Button
					variant="destructive"
					size="sm"
					onClick={() => signOutMutation.mutate()}
					disabled={signOutMutation.isPending}
				>
					{signOutMutation.isPending ? "Signing out…" : "Sign out"}
				</Button>
			</div>
		</div>
	);
}
