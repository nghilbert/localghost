import { useQuery } from "@tanstack/react-query";
import { BoxesIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { MyModelTable } from "#/features/cookbook/components/MyModelTable";
import { useModelPull } from "#/features/cookbook/hooks/use-model-pull";
import { useOllama } from "#/features/cookbook/hooks/use-ollama";
import {
	cookbookStatusQueryOptions,
	hardwareQueryOptions,
} from "#/features/cookbook/lib/cookbook.functions";

type MyModelsTabProps = {
	onBrowse: () => void;
};

export function MyModelsTab({ onBrowse }: MyModelsTabProps) {
	const { data: hardware } = useQuery(hardwareQueryOptions());

	const { data: ollamaStatus } = useQuery({
		...cookbookStatusQueryOptions(),
		refetchInterval: (query) => (query.state.data?.found ? 30_000 : 5_000),
	});

	const { pulling, stop } = useModelPull();
	const { deleteModel } = useOllama();

	const installedModels = ollamaStatus?.installedModels ?? [];
	const hasModels = installedModels.length > 0 || Object.keys(pulling).length > 0;

	if (!hasModels) {
		return (
			<div className="flex h-full flex-col p-6">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<BoxesIcon />
						</EmptyMedia>
						<EmptyTitle>No models yet</EmptyTitle>
						<EmptyDescription>
							Install a model from the catalog and it'll show up here while it downloads.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button onClick={onBrowse}>Browse models</Button>
					</EmptyContent>
				</Empty>
			</div>
		);
	}

	return (
		<div className="p-6">
			<MyModelTable
				hardware={hardware}
				installedModels={installedModels}
				pulling={pulling}
				onStop={stop}
				onDelete={(model) => deleteModel.mutate(model)}
			/>
		</div>
	);
}
