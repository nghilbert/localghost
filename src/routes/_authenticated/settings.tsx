import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PaletteIcon, PlugIcon, UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { authQueryOptions } from "#/features/auth/lib/auth.functions";
import { authClient } from "#/features/auth/lib/auth-client";
import { EndpointDialog } from "#/features/chat/components/EndpointDialog";
import { deleteEndpoint, endpointsQueryOptions } from "#/features/chat/lib/chat.functions";
import { THEME_LABELS, type Theme, useTheme } from "#/features/theme/ThemeProvider";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader title="Settings" />
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-2xl p-6">
					<Tabs defaultValue="account">
						<TabsList className="mb-4">
							<TabsTrigger value="account" className="gap-1.5">
								<UserIcon size={13} />
								Account
							</TabsTrigger>
							<TabsTrigger value="providers" className="gap-1.5">
								<PlugIcon size={13} />
								Providers
							</TabsTrigger>
							<TabsTrigger value="theme" className="gap-1.5">
								<PaletteIcon size={13} />
								Theme
							</TabsTrigger>
						</TabsList>

						<TabsContent value="account">
							<AccountTab />
						</TabsContent>
						<TabsContent value="providers">
							<ProvidersTab />
						</TabsContent>
						<TabsContent value="theme">
							<ThemeTab />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}

function AccountTab() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: session } = useQuery(authQueryOptions());
	const user = session?.user;

	const [name, setName] = useState(user?.name ?? "");

	const updateMut = useMutation({
		mutationFn: () => authClient.updateUser({ name }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session"] });
			toast.success("Profile updated");
		},
		onError: () => toast.error("Failed to update profile"),
	});

	const signOutMut = useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: () => {
			queryClient.invalidateQueries(authQueryOptions());
			navigate({ to: "/sign-in" });
		},
	});

	return (
		<div className="space-y-4">
			<div className="rounded-lg border p-4 space-y-3">
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
							onClick={() => updateMut.mutate()}
							disabled={!name.trim() || name === user?.name || updateMut.isPending}
							size="sm"
						>
							{updateMut.isPending ? "Saving…" : "Save"}
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
					onClick={() => signOutMut.mutate()}
					disabled={signOutMut.isPending}
				>
					{signOutMut.isPending ? "Signing out…" : "Sign out"}
				</Button>
			</div>
		</div>
	);
}

function ProvidersTab() {
	const queryClient = useQueryClient();
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.success("Endpoint removed");
		},
		onError: () => toast.error("Failed to remove endpoint"),
	});

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Configure LLM provider endpoints. API keys are encrypted at rest.
				</p>
				<EndpointDialog />
			</div>

			{endpoints.length === 0 && (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No providers configured yet
				</p>
			)}

			<ul className="space-y-2">
				{endpoints.map((ep) => (
					<li key={ep.id} className="flex items-center gap-3 rounded-lg border p-3">
						<div className="flex-1 min-w-0">
							<div className="text-sm font-medium">{ep.name}</div>
							<div className="truncate text-xs text-muted-foreground">{ep.url}</div>
							<div className="text-xs text-muted-foreground">
								{ep.provider} {ep.hasApiKey ? "· API key set" : "· No API key"}
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive"
							onClick={() => deleteMut.mutate(ep.id)}
							disabled={deleteMut.isPending}
						>
							Remove
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}

const THEME_SWATCHES: Record<Theme, string> = {
	default: "oklch(0.5 0.134 242.749)",
	ocean: "oklch(0.6 0.14 195)",
	forest: "oklch(0.58 0.14 150)",
	rose: "oklch(0.65 0.18 10)",
	midnight: "oklch(0.62 0.2 280)",
};

function ThemeTab() {
	const { theme, setTheme, themes } = useTheme();

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">Choose an accent color theme.</p>
			<div className="flex flex-wrap gap-3">
				{themes.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTheme(t)}
						className={cn(
							"flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors",
							theme === t && "border-primary bg-primary/5",
						)}
						aria-pressed={theme === t}
					>
						<span
							className="h-8 w-8 rounded-full border"
							style={{ backgroundColor: THEME_SWATCHES[t] }}
						/>
						<span className="text-xs">{THEME_LABELS[t]}</span>
					</button>
				))}
			</div>
		</div>
	);
}
