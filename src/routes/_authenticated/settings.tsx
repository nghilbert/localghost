import { createFileRoute } from "@tanstack/react-router";
import {
	BookmarkIcon,
	DatabaseIcon,
	KeyIcon,
	PaletteIcon,
	PlugIcon,
	ServerIcon,
	UserIcon,
	WebhookIcon,
} from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { AccountTab } from "#/features/settings/components/AccountTab";
import { DataTab } from "#/features/settings/components/DataTab";
import { McpTab } from "#/features/settings/components/McpTab";
import { PresetsTab } from "#/features/settings/components/PresetsTab";
import { ProvidersTab } from "#/features/settings/components/ProvidersTab";
import { ThemeTab } from "#/features/settings/components/ThemeTab";
import { TokensTab } from "#/features/settings/components/TokensTab";
import { WebhooksTab } from "#/features/settings/components/WebhooksTab";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<Tabs defaultValue="account" className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Settings"
				actions={
					<TabsList variant="line">
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
						<TabsTrigger value="data" className="gap-1.5">
							<DatabaseIcon size={13} />
							Data
						</TabsTrigger>
						<TabsTrigger value="mcp" className="gap-1.5">
							<ServerIcon size={13} />
							MCP
						</TabsTrigger>
					</TabsList>
				}
			/>
			<div className="mx-auto w-full max-w-2xl overflow-auto p-6">
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
				<TabsContent value="data">
					<DataTab />
				</TabsContent>
				<TabsContent value="mcp">
					<McpTab />
				</TabsContent>
			</div>
		</Tabs>
	);
}
