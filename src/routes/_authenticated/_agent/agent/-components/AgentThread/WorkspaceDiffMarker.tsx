import { code } from "@streamdown/code";
import { FileDiffIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { Marker, MarkerContent, MarkerIcon } from "#/shared/components/ui/marker";
import type { CodeAgentDiff } from "#/shared/domain/code-agent/diff";

/**
 * A run's aggregate working-tree diff. The adapter's `git diff` is whole-tree, one per
 * run, not one per file, so this never claims to show any single file's change.
 */
export function WorkspaceDiffMarker({ diff }: { diff: CodeAgentDiff }) {
	return (
		<Marker data-testid="workspace-diff-marker">
			<MarkerIcon>
				<FileDiffIcon />
			</MarkerIcon>
			<MarkerContent>
				<Streamdown plugins={{ code }}>{`\`\`\`diff\n${diff.diff}\n\`\`\``}</Streamdown>
			</MarkerContent>
		</Marker>
	);
}
