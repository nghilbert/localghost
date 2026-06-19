import { createFileRoute } from "@tanstack/react-router";
import {
	BrainIcon,
	DatabaseIcon,
	MessageSquareIcon,
	PaletteIcon,
	PlugIcon,
	ServerIcon,
	UserIcon,
	WrenchIcon,
} from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { AccountTab } from "#/features/settings/components/AccountTab";
import { ChatTab } from "#/features/settings/components/ChatTab";
import { DataTab } from "#/features/settings/components/DataTab";
import { McpTab } from "#/features/settings/components/McpTab";
import { MemoryTab } from "#/features/settings/components/MemoryTab";
import { ProvidersTab } from "#/features/settings/components/ProvidersTab";
import { SetupTab } from "#/features/settings/components/SetupTab";
import { savedMemoriesQueryOptions } from "#/features/settings/lib/memory.functions";
import { SettingsSearchSchema } from "#/features/settings/lib/schemas";
import { userSettingsQueryOptions } from "#/features/settings/lib/user-settings.functions";
import { AppearanceSettings } from "#/features/theme/AppearanceSettings";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
	validateSearch: (search) => SettingsSearchSchema.parse(search),
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(userSettingsQueryOptions()),
			context.queryClient.ensureQueryData(savedMemoriesQueryOptions()),
		]);
	},
});

function SettingsPage() {
	const { tab } = Route.useSearch();

	return (
		<Tabs defaultValue={tab ?? "account"} className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Settings"
				actions={
					<TabsList variant="line">
						<TabsTrigger value="account" className="gap-1.5">
							<UserIcon size={13} />
							Account
						</TabsTrigger>
						<TabsTrigger value="chat" className="gap-1.5">
							<MessageSquareIcon size={13} />
							Chat
						</TabsTrigger>
						<TabsTrigger value="memory" className="gap-1.5">
							<BrainIcon size={13} />
							Memory
						</TabsTrigger>
						<TabsTrigger value="setup" className="gap-1.5">
							<WrenchIcon size={13} />
							Setup
						</TabsTrigger>
						<TabsTrigger value="providers" className="gap-1.5">
							<PlugIcon size={13} />
							Providers
						</TabsTrigger>
						<TabsTrigger value="theme" className="gap-1.5">
							<PaletteIcon size={13} />
							Theme
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
				<TabsContent value="chat">
					<ChatTab />
				</TabsContent>
				<TabsContent value="memory">
					<MemoryTab />
				</TabsContent>
				<TabsContent value="setup">
					<SetupTab />
				</TabsContent>
				<TabsContent value="providers">
					<ProvidersTab />
				</TabsContent>
				<TabsContent value="theme">
					<AppearanceSettings />
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
