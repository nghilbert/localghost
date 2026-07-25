import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { Badge } from "#/shared/components/ui/badge";
import { Button } from "#/shared/components/ui/button";
import { Spinner } from "#/shared/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/components/ui/tooltip";
import { endpointHealthQueryOptions } from "#/shared/domain/endpoint/endpoint.functions";
import { cn } from "#/shared/lib/utils";

/**
 * Live reachability status for a saved endpoint: probes on mount, caches for
 * minutes, and offers a manual re-check. Mirrors the local llama.cpp panel's badge
 * so a dead URL or bad key is visible before a chat fails.
 */
export function EndpointHealthBadge({ endpointId }: { endpointId: string }) {
	const { data, isFetching, refetch } = useQuery(endpointHealthQueryOptions(endpointId));

	return (
		<div className="flex items-center gap-1">
			{!data ? (
				<Badge variant="secondary">
					<Spinner className="size-3" />
					Checking
				</Badge>
			) : data.ok ? (
				<Badge variant="secondary" className="bg-success/10 text-success">
					<CheckCircle2Icon />
					Reachable
				</Badge>
			) : (
				<Tooltip>
					<TooltipTrigger
						render={
							<Badge variant="secondary" className="bg-warning/10 text-warning">
								<CircleAlertIcon />
								Unreachable
							</Badge>
						}
					/>
					<TooltipContent>{data.error}</TooltipContent>
				</Tooltip>
			)}
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Re-check endpoint status"
							disabled={isFetching}
							onClick={() => void refetch()}
						/>
					}
				>
					<RefreshCwIcon className={cn(isFetching && "animate-spin")} />
				</TooltipTrigger>
				<TooltipContent>Re-check status</TooltipContent>
			</Tooltip>
		</div>
	);
}
