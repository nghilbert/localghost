import { createFileRoute, Link } from "@tanstack/react-router";
import { BrainIcon, PaletteIcon, PlugIcon, UserIcon } from "lucide-react";
import { Container } from "#/shared/components/ui/container";
import { ScrollArea } from "#/shared/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/shared/components/ui/tabs";
import { memoriesQueryOptions } from "#/shared/domain/memory/memory.functions";
import { userSettingsQueryOptions } from "#/shared/domain/user-settings/user-settings.functions";
import { AppearanceTab } from "./-components/AppearanceTab";
import { AccountTab } from "./-components/account/AccountTab";
import { EndpointsTab } from "./-components/endpoints/EndpointsTab";
import { MemoryTab } from "./-components/memory/MemoryTab";
import { settingsSearchSchema } from "./-lib/schemas";

export const Route = createFileRoute("/_authenticated/settings/")({
	head: () => ({ meta: [{ title: "Settings · localghost" }] }),
	component: SettingsPage,
	validateSearch: settingsSearchSchema,
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.query({ ...userSettingsQueryOptions(), staleTime: "static" }),
			context.queryClient.query({ ...memoriesQueryOptions(), staleTime: "static" }),
		]);
	},
});

function SettingsPage() {
	const { tab } = Route.useSearch();
	const activeTab = tab ?? "account";

	return (
		<Tabs value={activeTab} className="flex h-full flex-col overflow-hidden">
			<div className="shrink-0 overflow-x-auto border-b">
				<Container size="2xl" className="px-6 py-2">
					<TabsList variant="line">
						<TabsTrigger
							value="account"
							className="gap-1.5"
							nativeButton={false}
							render={<Link to="/settings" search={{ tab: "account" }} />}
						>
							<UserIcon size={13} />
							Account
						</TabsTrigger>
						<TabsTrigger
							value="memory"
							className="gap-1.5"
							nativeButton={false}
							render={<Link to="/settings" search={{ tab: "memory" }} />}
						>
							<BrainIcon size={13} />
							Memory
						</TabsTrigger>
						<TabsTrigger
							value="endpoints"
							className="gap-1.5"
							nativeButton={false}
							render={<Link to="/settings" search={{ tab: "endpoints" }} />}
						>
							<PlugIcon size={13} />
							Provider endpoints
						</TabsTrigger>
						<TabsTrigger
							value="appearance"
							className="gap-1.5"
							nativeButton={false}
							render={<Link to="/settings" search={{ tab: "appearance" }} />}
						>
							<PaletteIcon size={13} />
							Appearance
						</TabsTrigger>
					</TabsList>
				</Container>
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<Container size="2xl" className="p-6">
					<TabsContent value="account">
						<AccountTab />
					</TabsContent>
					<TabsContent value="memory">
						<MemoryTab />
					</TabsContent>
					<TabsContent value="endpoints">
						<EndpointsTab />
					</TabsContent>
					<TabsContent value="appearance">
						<AppearanceTab />
					</TabsContent>
				</Container>
			</ScrollArea>
		</Tabs>
	);
}
