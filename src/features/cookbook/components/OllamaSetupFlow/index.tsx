import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { Spinner } from "#/components/ui/spinner";
import { InstallProgressCard } from "#/features/cookbook/components/OllamaSetupFlow/InstallProgressCard";
import { ManualInstallCard } from "#/features/cookbook/components/OllamaSetupFlow/ManualInstallCard";
import { RemoteOllamaForm } from "#/features/cookbook/components/OllamaSetupFlow/RemoteOllamaForm";
import { SetupChoiceCards } from "#/features/cookbook/components/OllamaSetupFlow/SetupChoiceCards";
import {
	installOllama,
	ollamaInstallQueryOptions,
} from "#/features/cookbook/lib/install.functions";
import { INSTALL_IN_PROGRESS_PHASES } from "#/features/cookbook/lib/types";

export type SetupPath = "install" | "manual" | "remote";

/**
 * Guided Ollama setup shown when no running instance was found. The parent's
 * status query keeps polling; once Ollama appears this component unmounts.
 */
export function OllamaSetupFlow() {
	const queryClient = useQueryClient();
	const [chosenPath, setChosenPath] = useState<SetupPath | null>(null);

	const { data: installInfo } = useQuery({
		...ollamaInstallQueryOptions(),
		refetchInterval: (query) => {
			const data = query.state.data;
			const isInstalling =
				data?.isAdmin && INSTALL_IN_PROGRESS_PHASES.includes(data.installState.phase);
			return isInstalling ? 2000 : false;
		},
	});

	const installMutation = useMutation({
		mutationFn: () => installOllama(),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ollama-install"] }),
		onError: (error) => toast.error("Could not start the install", { description: error.message }),
	});

	function handleChoose(path: SetupPath) {
		if (path === "install") installMutation.mutate();
		setChosenPath(path);
	}

	if (!installInfo) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<Spinner className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Looking for Ollama…</EmptyTitle>
					<EmptyDescription>
						Checking this machine and known addresses for a running instance.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	if (chosenPath === "install" && installInfo.isAdmin) {
		return (
			<InstallProgressCard
				installState={installInfo.installState}
				onRetry={() => installMutation.mutate()}
				onBack={() => setChosenPath(null)}
			/>
		);
	}
	if (chosenPath === "manual") return <ManualInstallCard onBack={() => setChosenPath(null)} />;
	if (chosenPath === "remote") return <RemoteOllamaForm onBack={() => setChosenPath(null)} />;

	return <SetupChoiceCards installInfo={installInfo} onChoose={handleChoose} />;
}
