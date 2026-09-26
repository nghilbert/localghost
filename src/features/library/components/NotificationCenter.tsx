import { DownloadIcon } from "lucide-react";
import { Popover } from "#/components/ui/popover";
import { Sidebar } from "#/components/ui/sidebar";
import { useModelDownload } from "#/features/library/hooks/use-model-download";
import { DownloadRow } from "./DownloadRow";

/** The sidebar's list of running model downloads. */
export function NotificationCenter() {
	const { pulling, stop } = useModelDownload();
	const inFlight = Object.entries(pulling).map(([model, progress]) => ({ model, ...progress }));

	if (inFlight.length === 0) return null;

	return (
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Popover.Root>
					<Popover.Trigger render={<Sidebar.MenuButton />}>
						<DownloadIcon />
						Downloads
					</Popover.Trigger>
					<Sidebar.MenuBadge>{inFlight.length}</Sidebar.MenuBadge>
					<Popover.Content side="top" align="start" className="w-80">
						<ul aria-label="In-flight downloads" className="flex flex-col gap-2">
							{inFlight.map((pull) => (
								<li key={pull.model}>
									<DownloadRow model={pull.model} pullState={pull} size="sm" onStop={stop} />
								</li>
							))}
						</ul>
					</Popover.Content>
				</Popover.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	);
}
