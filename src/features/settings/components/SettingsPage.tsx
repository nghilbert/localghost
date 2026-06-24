import { getRouteApi, useNavigate } from "@tanstack/react-router";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { AccountTab } from "#/features/settings/components/AccountTab";
import { AppearanceTab } from "#/features/settings/components/AppearanceTab";
import { ChatTab } from "#/features/settings/components/ChatTab";
import { DataTab } from "#/features/settings/components/DataTab";
import { McpTab } from "#/features/settings/components/McpTab";
import { MemoryTab } from "#/features/settings/components/MemoryTab";
import { ProvidersTab } from "#/features/settings/components/ProvidersTab";
import { SetupTab } from "#/features/settings/components/SetupTab";
import { TAB_VALUES } from "#/features/settings/lib/schemas";

const routeApi = getRouteApi("/_authenticated/settings");

export function SettingsPage() {
	const { tab } = routeApi.useSearch();
	const navigate = useNavigate();
	const activeTab = tab ?? "account";

	function handleTabChange(value: string) {
		if (TAB_VALUES.includes(value as (typeof TAB_VALUES)[number])) {
			navigate({ to: "/settings", search: { tab: value as (typeof TAB_VALUES)[number] } });
		}
	}

	return (
		<Tabs
			value={activeTab}
			onValueChange={handleTabChange}
			className="flex h-full flex-col overflow-hidden"
		>
			<div className="shrink-0 border-b px-4 py-2">
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
					<TabsTrigger value="appearance" className="gap-1.5">
						<PaletteIcon size={13} />
						Appearance
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
			</div>
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
				<TabsContent value="appearance">
					<AppearanceTab />
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
