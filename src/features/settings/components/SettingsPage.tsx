import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { BrainIcon, PaletteIcon, PlugIcon, UserIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { AccountTab } from "#/features/settings/components/AccountTab";
import { AppearanceTab } from "#/features/settings/components/AppearanceTab";
import { EndpointsTab } from "#/features/settings/components/EndpointsTab";
import { MemoryTab } from "#/features/settings/components/MemoryTab";
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
					<TabsTrigger value="memory" className="gap-1.5">
						<BrainIcon size={13} />
						Memory
					</TabsTrigger>
					<TabsTrigger value="endpoints" className="gap-1.5">
						<PlugIcon size={13} />
						Provider endpoints
					</TabsTrigger>
					<TabsTrigger value="appearance" className="gap-1.5">
						<PaletteIcon size={13} />
						Appearance
					</TabsTrigger>
				</TabsList>
			</div>
			<div className="mx-auto w-full max-w-2xl overflow-auto p-6">
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
			</div>
		</Tabs>
	);
}
