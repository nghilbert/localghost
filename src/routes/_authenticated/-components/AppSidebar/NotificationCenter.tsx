import { DownloadIcon, SquareIcon } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/shared/components/ui/popover";
import {
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/shared/components/ui/sidebar";
import { DownloadStatus } from "#/shared/domain/model/DownloadStatus";
import { useModelDownload } from "#/shared/domain/model/use-models";

/**
 * Sidebar-footer notification center: today's only source is model downloads,
 * read from the same merged `pulling` map the Library page uses.
 */
export function NotificationCenter() {
	const { pulling, stop } = useModelDownload();
	const inFlight = Object.entries(pulling).map(([model, progress]) => ({ model, ...progress }));

	if (inFlight.length === 0) return null;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<Popover>
					<PopoverTrigger render={<SidebarMenuButton data-testid="notification-center-trigger" />}>
						<DownloadIcon />
						Downloads
					</PopoverTrigger>
					<SidebarMenuBadge>{inFlight.length}</SidebarMenuBadge>
					<PopoverContent side="top" align="start" className="w-80">
						<div className="flex flex-col gap-3 p-1">
							{inFlight.map((pull) => (
								<div
									key={pull.model}
									className="flex flex-col gap-1"
									data-testid="notification-item"
								>
									<div className="flex items-center justify-between gap-2">
										<span className="truncate text-sm font-medium">{pull.model}</span>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Stop pulling ${pull.model}`}
											data-testid="notification-stop-button"
											onClick={() => stop(pull.model)}
										>
											<SquareIcon size={12} />
										</Button>
									</div>
									<DownloadStatus pullState={pull} size="sm" />
								</div>
							))}
						</div>
					</PopoverContent>
				</Popover>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
