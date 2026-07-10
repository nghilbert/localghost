import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrainIcon, PaletteIcon, PlugIcon, UserIcon } from "lucide-react";
import { memoriesQueryOptions } from "#/entities/memory/memory.functions";
import { userSettingsQueryOptions } from "#/entities/user-settings/user-settings.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/shared/ui/tabs";
import { AccountTab } from "./-settings/AccountTab";
import { AppearanceTab } from "./-settings/AppearanceTab";
import { EndpointsTab } from "./-settings/EndpointsTab";
import { MemoryTab } from "./-settings/MemoryTab";
import { isTabValue, settingsSearchSchema } from "./-settings/schemas";

export const Route = createFileRoute("/_authenticated/settings")({
	head: () => ({ meta: [{ title: "Settings · localghost" }] }),
	component: SettingsPage,
	validateSearch: (search) => settingsSearchSchema.parse(search),
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(userSettingsQueryOptions()),
			context.queryClient.ensureQueryData(memoriesQueryOptions()),
		]);
	},
});

function SettingsPage() {
	const { tab } = Route.useSearch();
	const navigate = useNavigate();
	const activeTab = tab ?? "account";

	function handleTabChange(value: string) {
		if (isTabValue(value)) {
			navigate({ to: "/settings", search: { tab: value } });
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
