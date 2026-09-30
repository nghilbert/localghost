import { DownloadIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import type { PullProgress } from "#/features/library/library.types";
import { DownloadRow } from "./DownloadRow";

type ModelPullControlsProps = {
	modelId: string;
	pullState: PullProgress | undefined;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
};

/** The download button, or the running download with its stop button, for one model quant. */
export function ModelPullControls({ modelId, pullState, onPull, onStop }: ModelPullControlsProps) {
	if (pullState) {
		return (
			<DownloadRow
				model={modelId}
				title={pullState.status || "Downloading"}
				pullState={pullState}
				onStop={onStop}
			/>
		);
	}

	return (
		<Button type="button" size="sm" onClick={() => onPull(modelId)}>
			<DownloadIcon />
			Download
		</Button>
	);
}
