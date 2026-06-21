import { useQuery } from "@tanstack/react-query";
import { BoxesIcon } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { MyModelTable } from "#/features/library/components/MyModelTable";
import { useModelPull } from "#/features/library/hooks/use-model-pull";
import { useOllama } from "#/features/library/hooks/use-ollama";
import {
	hardwareQueryOptions,
	libraryStatusQueryOptions,
} from "#/features/library/lib/library.functions";

type MyModelsTabProps = {
	onBrowse: () => void;
};

export function MyModelsTab({ onBrowse }: MyModelsTabProps) {
	const { data: hardware } = useQuery(hardwareQueryOptions());

	const { data: ollamaStatus } = useQuery({
		...libraryStatusQueryOptions(),
		refetchInterval: (query) => (query.state.data?.found ? 30_000 : 5_000),
	});

	const { pulling, stop } = useModelPull();
	const { deleteModel } = useOllama();
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);

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
				onDelete={(model) => setPendingDelete(model)}
			/>
			<AlertDialog
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this model?</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingDelete} will be removed from this machine. You'll need to download it again to
							use it.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								if (pendingDelete) deleteModel.mutate(pendingDelete);
								setPendingDelete(null);
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
