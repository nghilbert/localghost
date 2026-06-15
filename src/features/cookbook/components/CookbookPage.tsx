import { getRouteApi } from "@tanstack/react-router";
import { Rows3Icon, ScaleIcon } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { BrowseTab } from "#/features/cookbook/components/BrowseTab";
import { CompareTab } from "#/features/cookbook/components/CompareTab";

const routeApi = getRouteApi("/_authenticated/cookbook");

export function CookbookPage() {
	const { tab } = routeApi.useSearch();

	return (
		<Tabs defaultValue={tab ?? "browse"} className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Cookbook"
				description="Browse and install local models, or compare them side by side."
				actions={
					<TabsList variant="line">
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
			<TabsContent value="browse" className="overflow-auto">
				<BrowseTab />
			</TabsContent>
			<TabsContent value="compare" className="flex min-h-0 flex-col overflow-hidden">
				<CompareTab />
			</TabsContent>
		</Tabs>
	);
}
