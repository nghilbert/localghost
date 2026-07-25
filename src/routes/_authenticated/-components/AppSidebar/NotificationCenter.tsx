import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, SquareIcon } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/shared/components/ui/popover";
import { Progress } from "#/shared/components/ui/progress";
import {
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/shared/components/ui/sidebar";
import { activeDownloadsQueryOptions } from "#/shared/domain/model/model.functions";
import { formatPullDetail } from "#/shared/domain/model/pull-format";
import { useModelDownload } from "#/shared/domain/model/use-model-download";

/**
 * Sidebar-footer notification center: today's only source is model downloads,
 * sourced from the same server-side download registry the Library page reads,
 * so progress survives navigation and reloads. Built to take more sources later.
 */
export function NotificationCenter() {
	const { data: activePulls = [] } = useQuery(activeDownloadsQueryOptions());
	const { stop } = useModelDownload();
	const inFlight = activePulls.filter((pull) => !pull.done);

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
							{inFlight.map((pull) => {
								const pct =
									pull.total && pull.completed
										? Math.round((pull.completed / pull.total) * 100)
										: null;
								const detail = formatPullDetail(pull);
								return (
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
										{pct !== null && <Progress value={pct} className="h-1" />}
										{detail && (
											<span className="text-xs text-muted-foreground tabular-nums">{detail}</span>
										)}
									</div>
								);
							})}
						</div>
					</PopoverContent>
				</Popover>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
