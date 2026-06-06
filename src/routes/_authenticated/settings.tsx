import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	BookmarkIcon,
	CheckCircleIcon,
	KeyIcon,
	PaletteIcon,
	PlugIcon,
	ServerIcon,
	TrashIcon,
	UserIcon,
	WebhookIcon,
	XCircleIcon,
} from "lucide-react";
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
import {
	createPreset,
	deletePreset,
	presetsQueryOptions,
} from "#/features/chat/lib/preset.functions";
import {
	createMcpServer,
	deleteMcpServer,
	mcpServersQueryOptions,
	testMcpServer,
	updateMcpServer,
} from "#/features/mcp/lib/mcp.functions";
import { THEME_LABELS, type Theme, useTheme } from "#/features/theme/ThemeProvider";
import {
	createToken,
	deleteToken,
	tokensQueryOptions,
} from "#/features/tokens/lib/token.functions";
import {
	createWebhook,
	deleteWebhook,
	testWebhook,
	updateWebhook,
	webhooksQueryOptions,
} from "#/features/webhooks/lib/webhook.functions";
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
							<TabsTrigger value="webhooks" className="gap-1.5">
								<WebhookIcon size={13} />
								Webhooks
							</TabsTrigger>
							<TabsTrigger value="tokens" className="gap-1.5">
								<KeyIcon size={13} />
								API Tokens
							</TabsTrigger>
							<TabsTrigger value="presets" className="gap-1.5">
								<BookmarkIcon size={13} />
								Presets
							</TabsTrigger>
							<TabsTrigger value="mcp" className="gap-1.5">
								<ServerIcon size={13} />
								MCP
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
						<TabsContent value="webhooks">
							<WebhooksTab />
						</TabsContent>
						<TabsContent value="tokens">
							<TokensTab />
						</TabsContent>
						<TabsContent value="presets">
							<PresetsTab />
						</TabsContent>
						<TabsContent value="mcp">
							<McpTab />
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

const WEBHOOK_EVENT_OPTIONS = ["chat.completed", "session.created", "chat.message"] as const;

function WebhooksTab() {
	const queryClient = useQueryClient();
	const { data: webhooks = [] } = useQuery(webhooksQueryOptions());
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [secret, setSecret] = useState("");
	const [events, setEvents] = useState<string[]>(["chat.completed"]);
	const [formError, setFormError] = useState<string | null>(null);

	const createMut = useMutation({
		mutationFn: createWebhook,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["webhooks"] });
			setShowForm(false);
			setName("");
			setUrl("");
			setSecret("");
			setEvents(["chat.completed"]);
			setFormError(null);
		},
		onError: (e) => setFormError(e.message),
	});

	const toggleMut = useMutation({
		mutationFn: updateWebhook,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
	});

	const deleteMut = useMutation({
		mutationFn: deleteWebhook,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
	});

	const testMut = useMutation({
		mutationFn: testWebhook,
		onSuccess: (r) => {
			queryClient.invalidateQueries({ queryKey: ["webhooks"] });
			toast.success(`Test ping: HTTP ${r.status}`);
		},
		onError: (e) => toast.error(`Test failed: ${e.message}`),
	});

	function toggleEvent(evt: string) {
		setEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Fire HTTP POST when events happen in your workspace.
				</p>
				<Button size="sm" onClick={() => setShowForm((p) => !p)}>
					{showForm ? "Cancel" : "Add webhook"}
				</Button>
			</div>

			{showForm && (
				<div className="space-y-3 rounded-lg border p-4">
					<h3 className="text-sm font-medium">New webhook</h3>
					{formError && <p className="text-xs text-destructive">{formError}</p>}
					<div className="space-y-2">
						<Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
						<Input
							placeholder="https://example.com/hook"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
						<Input
							placeholder="Signing secret (optional)"
							type="password"
							value={secret}
							onChange={(e) => setSecret(e.target.value)}
						/>
					</div>
					<div>
						<p className="mb-1.5 text-xs text-muted-foreground">Events</p>
						<div className="flex flex-wrap gap-2">
							{WEBHOOK_EVENT_OPTIONS.map((evt) => (
								<button
									key={evt}
									type="button"
									onClick={() => toggleEvent(evt)}
									className={cn(
										"rounded-full border px-2.5 py-0.5 text-xs",
										events.includes(evt)
											? "border-primary bg-primary/10 text-primary"
											: "border-border text-muted-foreground hover:border-primary/50",
									)}
								>
									{evt}
								</button>
							))}
						</div>
					</div>
					<Button
						size="sm"
						disabled={!name.trim() || !url.trim() || !events.length || createMut.isPending}
						onClick={() =>
							createMut.mutate({ data: { name, url, events, secret: secret || undefined } })
						}
					>
						{createMut.isPending ? "Saving…" : "Create"}
					</Button>
				</div>
			)}

			{webhooks.length === 0 && !showForm && (
				<p className="text-sm text-muted-foreground">No webhooks yet.</p>
			)}

			<div className="space-y-2">
				{webhooks.map((wh) => (
					<div key={wh.id} className="space-y-1 rounded-lg border p-3">
						<div className="flex items-center justify-between gap-2">
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">{wh.name}</p>
								<p className="truncate text-xs text-muted-foreground">{wh.url}</p>
							</div>
							<div className="flex shrink-0 items-center gap-1.5">
								<Button
									variant="outline"
									size="sm"
									className="h-7 px-2 text-xs"
									onClick={() => testMut.mutate({ data: { id: wh.id } })}
									disabled={testMut.isPending}
								>
									Test
								</Button>
								<button
									type="button"
									onClick={() => toggleMut.mutate({ data: { id: wh.id, isActive: !wh.isActive } })}
									className={cn(
										"rounded px-2 py-0.5 text-xs",
										wh.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
									)}
								>
									{wh.isActive ? "Active" : "Paused"}
								</button>
								<button
									type="button"
									onClick={() => deleteMut.mutate({ data: { id: wh.id } })}
									className="text-destructive hover:text-destructive/80"
									aria-label="Delete webhook"
								>
									<TrashIcon size={13} />
								</button>
							</div>
						</div>
						<div className="flex flex-wrap gap-1">
							{wh.events.map((e) => (
								<span
									key={e}
									className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
								>
									{e}
								</span>
							))}
						</div>
						{wh.lastTriggeredAt && (
							<p className="text-[10px] text-muted-foreground">
								Last fired: {new Date(wh.lastTriggeredAt).toLocaleString()} · HTTP{" "}
								{wh.lastStatusCode ?? "?"}
								{wh.lastError && <span className="text-destructive"> · {wh.lastError}</span>}
							</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function TokensTab() {
	const queryClient = useQueryClient();
	const { data: tokens = [] } = useQuery(tokensQueryOptions());
	const [name, setName] = useState("");
	const [expiresInDays, setExpiresInDays] = useState<string>("");
	const [newToken, setNewToken] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const createMut = useMutation({
		mutationFn: createToken,
		onSuccess: (res) => {
			queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
			setNewToken(res.raw);
			setName("");
			setExpiresInDays("");
			setError(null);
		},
		onError: (e) => setError(e.message),
	});

	const deleteMut = useMutation({
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
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
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
						disabled={!name.trim() || createMut.isPending}
						onClick={() =>
							createMut.mutate({
								data: {
									name,
									expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
								},
							})
						}
					>
						{createMut.isPending ? "Creating…" : "Create"}
					</Button>
				</div>
			</div>

			{tokens.length === 0 ? (
				<p className="text-sm text-muted-foreground">No tokens yet.</p>
			) : (
				<div className="space-y-2">
					{tokens.map((t) => (
						<div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium">{t.name}</p>
								<p className="text-xs text-muted-foreground">
									<code>{t.prefix}…</code>
									{t.expiresAt && ` · Expires ${new Date(t.expiresAt).toLocaleDateString()}`}
									{t.lastUsedAt && ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
								</p>
							</div>
							<button
								type="button"
								onClick={() => deleteMut.mutate({ data: { id: t.id } })}
								className="shrink-0 text-destructive hover:text-destructive/80"
								aria-label="Revoke token"
							>
								<TrashIcon size={13} />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function McpTab() {
	const queryClient = useQueryClient();
	const { data: servers = [] } = useQuery(mcpServersQueryOptions());
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [type, setType] = useState<"streamable-http" | "sse">("streamable-http");
	const [formError, setFormError] = useState<string | null>(null);
	const [testResults, setTestResults] = useState<
		Record<string, { ok: boolean; tools: { name: string; description: string }[] } | null>
	>({});
	const [testingId, setTestingId] = useState<string | null>(null);

	const createMut = useMutation({
		mutationFn: createMcpServer,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
			setShowForm(false);
			setName("");
			setUrl("");
			setType("streamable-http");
			setFormError(null);
		},
		onError: (e) => setFormError(e.message),
	});

	const toggleMut = useMutation({
		mutationFn: updateMcpServer,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp-servers"] }),
	});

	const deleteMut = useMutation({
		mutationFn: deleteMcpServer,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp-servers"] }),
	});

	async function handleTest(id: string) {
		setTestingId(id);
		setTestResults((prev) => ({ ...prev, [id]: null }));
		try {
			const res = await testMcpServer({ data: { id } });
			setTestResults((prev) => ({ ...prev, [id]: res }));
		} catch {
			setTestResults((prev) => ({ ...prev, [id]: { ok: false, tools: [] } }));
		} finally {
			setTestingId(null);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Connect external MCP servers to expose their tools to the agent.
				</p>
				<Button size="sm" onClick={() => setShowForm((p) => !p)}>
					{showForm ? "Cancel" : "Add server"}
				</Button>
			</div>

			{showForm && (
				<div className="space-y-3 rounded-lg border p-4">
					<h3 className="text-sm font-medium">New MCP server</h3>
					{formError && <p className="text-xs text-destructive">{formError}</p>}
					<Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
					<Input
						placeholder="https://mcp.example.com/mcp"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
					/>
					<div className="flex gap-2">
						{(["streamable-http", "sse"] as const).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setType(t)}
								className={cn(
									"rounded-full border px-3 py-1 text-xs",
									type === t
										? "border-primary bg-primary/10 text-primary"
										: "border-border text-muted-foreground hover:border-primary/50",
								)}
							>
								{t}
							</button>
						))}
					</div>
					<Button
						size="sm"
						disabled={!name.trim() || !url.trim() || createMut.isPending}
						onClick={() => createMut.mutate({ data: { name, url, type } })}
					>
						{createMut.isPending ? "Adding…" : "Add"}
					</Button>
				</div>
			)}

			{servers.length === 0 && !showForm && (
				<p className="text-sm text-muted-foreground">No MCP servers configured.</p>
			)}

			<div className="space-y-2">
				{servers.map((srv) => {
					const result = testResults[srv.id];
					return (
						<div key={srv.id} className="rounded-lg border p-3 space-y-2">
							<div className="flex items-center gap-3">
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">{srv.name}</p>
									<p className="truncate text-xs text-muted-foreground">{srv.url}</p>
									<p className="text-xs text-muted-foreground">{srv.type}</p>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										className="h-7 px-2 text-xs"
										onClick={() => handleTest(srv.id)}
										disabled={testingId === srv.id}
									>
										{testingId === srv.id ? "Testing…" : "Test"}
									</Button>
									<button
										type="button"
										onClick={() =>
											toggleMut.mutate({ data: { id: srv.id, enabled: !srv.enabled } })
										}
										className={cn(
											"rounded px-2 py-0.5 text-xs",
											srv.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
										)}
									>
										{srv.enabled ? "Enabled" : "Disabled"}
									</button>
									<button
										type="button"
										onClick={() => deleteMut.mutate({ data: { id: srv.id } })}
										className="text-destructive hover:text-destructive/80"
										aria-label="Delete MCP server"
									>
										<TrashIcon size={13} />
									</button>
								</div>
							</div>
							{result !== undefined && result !== null && (
								<div className="rounded bg-muted/50 p-2 text-xs">
									<div className="flex items-center gap-1 font-medium">
										{result.ok ? (
											<CheckCircleIcon size={12} className="text-green-500" />
										) : (
											<XCircleIcon size={12} className="text-destructive" />
										)}
										{result.ok
											? `Connected — ${result.tools.length} tool${result.tools.length === 1 ? "" : "s"}`
											: "Connection failed"}
									</div>
									{result.tools.length > 0 && (
										<ul className="mt-1 space-y-0.5 text-muted-foreground">
											{result.tools.slice(0, 8).map((t) => (
												<li key={t.name}>
													<code>{t.name}</code>
													{t.description && ` — ${t.description}`}
												</li>
											))}
											{result.tools.length > 8 && <li>…and {result.tools.length - 8} more</li>}
										</ul>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function PresetsTab() {
	const queryClient = useQueryClient();
	const { data: presets = [] } = useQuery(presetsQueryOptions());
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [systemPrompt, setSystemPrompt] = useState("");

	const createMut = useMutation({
		mutationFn: () =>
			createPreset({
				data: {
					name: name.trim(),
					description: description.trim() || undefined,
					systemPrompt: systemPrompt.trim(),
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chat-presets"] });
			setName("");
			setDescription("");
			setSystemPrompt("");
			toast.success("Preset saved");
		},
		onError: (e) => toast.error(e.message),
	});

	const deleteMut = useMutation({
		mutationFn: (id: string) => deletePreset({ data: { id } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-presets"] }),
		onError: (e) => toast.error(e.message),
	});

	return (
		<div className="space-y-6">
			<section>
				<h2 className="mb-3 text-sm font-medium">New preset</h2>
				<div className="space-y-2">
					<Input placeholder="Preset name" value={name} onChange={(e) => setName(e.target.value)} />
					<Input
						placeholder="Description (optional)"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
					<textarea
						value={systemPrompt}
						onChange={(e) => setSystemPrompt(e.target.value)}
						placeholder="System prompt…"
						rows={4}
						className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
					/>
					<Button
						onClick={() => createMut.mutate()}
						disabled={!name.trim() || !systemPrompt.trim() || createMut.isPending}
						size="sm"
					>
						Save preset
					</Button>
				</div>
			</section>
			{presets.length > 0 && (
				<section>
					<h2 className="mb-3 text-sm font-medium">Saved presets</h2>
					<div className="space-y-2">
						{presets.map((p) => (
							<div key={p.id} className="flex items-start gap-3 rounded-lg border p-3">
								<div className="min-w-0 flex-1">
									<div className="text-sm font-medium">{p.name}</div>
									{p.description && (
										<div className="text-xs text-muted-foreground">{p.description}</div>
									)}
									<div className="mt-1 truncate text-xs text-muted-foreground">
										{p.systemPrompt.slice(0, 100)}
										{p.systemPrompt.length > 100 ? "…" : ""}
									</div>
								</div>
								<button
									type="button"
									onClick={() => deleteMut.mutate(p.id)}
									className="shrink-0 text-muted-foreground hover:text-destructive"
									aria-label="Delete preset"
								>
									<TrashIcon size={13} />
								</button>
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
