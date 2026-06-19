import { getRouteApi } from "@tanstack/react-router";
import { BoxesIcon, Rows3Icon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { BrowseTab } from "#/features/library/components/BrowseTab";
import { MyModelsTab } from "#/features/library/components/MyModelsTab";

const routeApi = getRouteApi("/_authenticated/library");

const TABS = ["my-models", "browse"] as const;
type LibraryTab = (typeof TABS)[number];

function isLibraryTab(value: string): value is LibraryTab {
	return TABS.some((candidate) => candidate === value);
}

export function LibraryPage() {
	const { tab } = routeApi.useSearch();
	const navigate = routeApi.useNavigate();

	return (
		<Tabs
			value={tab ?? "my-models"}
			onValueChange={(value) => {
				if (isLibraryTab(value)) navigate({ search: { tab: value } });
			}}
			className="flex h-full flex-col overflow-hidden"
		>
			<div className="shrink-0 border-b px-4 py-2">
				<TabsList variant="line">
					<TabsTrigger value="my-models" className="gap-1.5">
						<BoxesIcon size={13} />
						My Models
					</TabsTrigger>
					<TabsTrigger value="browse" className="gap-1.5">
						<Rows3Icon size={13} />
						Browse
					</TabsTrigger>
				</TabsList>
			</div>
			<TabsContent value="my-models" className="flex flex-col overflow-auto">
				<MyModelsTab onBrowse={() => navigate({ search: { tab: "browse" } })} />
			</TabsContent>
			<TabsContent value="browse" className="overflow-auto">
				<BrowseTab />
			</TabsContent>
		</Tabs>
	);
}
