import { getRouteApi } from "@tanstack/react-router";
import { BoxesIcon, Rows3Icon, ScaleIcon } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { BrowseTab } from "#/features/cookbook/components/BrowseTab";
import { CompareTab } from "#/features/cookbook/components/CompareTab";
import { MyModelsTab } from "#/features/cookbook/components/MyModelsTab";

const routeApi = getRouteApi("/_authenticated/cookbook");

const TABS = ["my-models", "browse", "compare"] as const;
type CookbookTab = (typeof TABS)[number];

function isCookbookTab(value: string): value is CookbookTab {
	return TABS.some((candidate) => candidate === value);
}

export function CookbookPage() {
	const { tab } = routeApi.useSearch();
	const navigate = routeApi.useNavigate();

	return (
		<Tabs
			value={tab ?? "my-models"}
			onValueChange={(value) => {
				if (isCookbookTab(value)) navigate({ search: { tab: value } });
			}}
			className="flex h-full flex-col overflow-hidden"
		>
			<PageHeader
				title="Cookbook"
				description="Browse and install local models, or compare them side by side."
				actions={
					<TabsList variant="line">
						<TabsTrigger value="my-models" className="gap-1.5">
							<BoxesIcon size={13} />
							My Models
						</TabsTrigger>
						<TabsTrigger value="browse" className="gap-1.5">
							<Rows3Icon size={13} />
							Browse
						</TabsTrigger>
						<TabsTrigger value="compare" className="gap-1.5">
							<ScaleIcon size={13} />
							Compare
						</TabsTrigger>
					</TabsList>
				}
			/>
			<TabsContent value="my-models" className="flex flex-col overflow-auto">
				<MyModelsTab onBrowse={() => navigate({ search: { tab: "browse" } })} />
			</TabsContent>
			<TabsContent value="browse" className="overflow-auto">
				<BrowseTab />
			</TabsContent>
			<TabsContent value="compare" className="flex min-h-0 flex-col overflow-hidden">
				<CompareTab />
			</TabsContent>
		</Tabs>
	);
}
