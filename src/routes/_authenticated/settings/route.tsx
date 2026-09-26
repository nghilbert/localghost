import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { BrainIcon, PaletteIcon, PlugIcon, SlidersHorizontalIcon, UserIcon } from "lucide-react";
import { Page } from "#/components/layout/Page";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Tabs } from "#/components/ui/tabs";

const SECTIONS = [
	{ to: "/settings/account", label: "Account", icon: UserIcon },
	{ to: "/settings/memory", label: "Memory", icon: BrainIcon },
	{ to: "/settings/endpoints", label: "Endpoints", icon: PlugIcon },
	{ to: "/settings/models", label: "Models", icon: SlidersHorizontalIcon },
	{ to: "/settings/appearance", label: "Appearance", icon: PaletteIcon },
] as const;

export const Route = createFileRoute("/_authenticated/settings")({
	head: () => ({ meta: [{ title: "Settings · localghost" }] }),
	component: SettingsLayout,
});

function SettingsLayout() {
	const pathname = useLocation({ select: (location) => location.pathname });

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="shrink-0 overflow-x-auto border-b border-line">
				<Page size="md" spacing="none" className="px-6 pt-2">
					<Tabs.Root value={pathname} layout="underline">
						<Tabs.List className="border-b-0">
							{SECTIONS.map(({ to, label, icon: Icon }) => (
								<Tabs.Tab key={to} value={to} nativeButton={false} render={<Link to={to} />}>
									<Icon />
									{label}
								</Tabs.Tab>
							))}
						</Tabs.List>
					</Tabs.Root>
				</Page>
			</div>
			<ScrollArea.Root className="flex-1">
				<ScrollArea.Viewport>
					<Page size="md" spacing="none" className="gap-4 p-6">
						<Outlet />
					</Page>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar />
			</ScrollArea.Root>
		</div>
	);
}
