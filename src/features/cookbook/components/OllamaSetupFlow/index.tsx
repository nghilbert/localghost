import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { Spinner } from "#/components/ui/spinner";
import { InstallCard } from "#/features/cookbook/components/OllamaSetupFlow/InstallCard";
import { RemoteOllamaForm } from "#/features/cookbook/components/OllamaSetupFlow/RemoteOllamaForm";
import { ollamaInstallQueryOptions } from "#/features/cookbook/lib/install.functions";
import { INSTALL_IN_PROGRESS_PHASES } from "#/features/cookbook/lib/types";

/**
 * Guided Ollama setup shown when no running instance was found. The parent's
 * status query keeps polling; once Ollama appears this component unmounts.
 */
export function OllamaSetupFlow() {
	const [isRemoteFormOpen, setIsRemoteFormOpen] = useState(false);

	const { data: installInfo } = useQuery({
		...ollamaInstallQueryOptions(),
		refetchInterval: (query) => {
			const data = query.state.data;
			const isInstalling =
				data?.isAdmin && INSTALL_IN_PROGRESS_PHASES.includes(data.installState.phase);
			return isInstalling ? 2000 : false;
		},
	});

	if (!installInfo) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<Spinner className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Checking setup options…</EmptyTitle>
					<EmptyDescription>
						Ollama wasn't found, so we're working out the best way to set it up here.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	if (isRemoteFormOpen) return <RemoteOllamaForm onBack={() => setIsRemoteFormOpen(false)} />;

	return <InstallCard installInfo={installInfo} onRemote={() => setIsRemoteFormOpen(true)} />;
}
