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
import { Spinner } from "#/shared/components/ui/spinner";
import { libraryStatusQueryOptions } from "#/shared/domain/model/model.functions";
import { formatPullDetail } from "#/shared/domain/model/pull-format";
import { pullProgressPercent } from "#/shared/domain/model/pull-progress";
import { useModelDownload, useModelDownloadEvents } from "#/shared/domain/model/use-models";

/**
 * Sidebar-footer notification center: today's only source is model downloads,
 * read from the same runtime-status query the Library page uses.
 */
export function NotificationCenter() {
	const { data: runtimeStatus } = useQuery(libraryStatusQueryOptions());
	const { stop } = useModelDownload(runtimeStatus?.endpointId ?? null);
	useModelDownloadEvents(runtimeStatus?.endpointId ?? null);
	const inFlight = Object.entries(runtimeStatus?.found ? runtimeStatus.downloads : {}).map(
		([model, progress]) => ({ model, ...progress }),
	);

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
								const pct = pullProgressPercent(pull);
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
										{pct === null ? (
											<Spinner className="size-3 text-muted-foreground" />
										) : (
											<Progress value={pct} className="h-1" />
										)}
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
