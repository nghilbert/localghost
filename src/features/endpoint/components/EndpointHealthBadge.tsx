import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "tailwind-variants";
import { StatusBadge } from "#/components/layout/StatusBadge";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { Tooltip } from "#/components/ui/tooltip";
import { endpointQueries } from "#/features/endpoint/endpoint.queries";

/** Whether a saved endpoint is reachable with its key, with a button to check again. */
export function EndpointHealthBadge({ endpointId }: { endpointId: string }) {
	const { data, isFetching, refetch } = useQuery(endpointQueries.health(endpointId));

	return (
		<div className="flex items-center gap-1">
			{!data ? (
				<Badge>
					<Spinner size="sm" />
					Checking
				</Badge>
			) : data.ok ? (
				<StatusBadge tone="success">
					<CheckCircle2Icon />
					Reachable
				</StatusBadge>
			) : (
				<Tooltip.Root>
					<Tooltip.Trigger
						render={
							<StatusBadge tone="warning">
								<CircleAlertIcon />
								Unreachable
							</StatusBadge>
						}
					/>
					<Tooltip.Content>{data.error}</Tooltip.Content>
				</Tooltip.Root>
			)}
			<Tooltip.Root>
				<Tooltip.Trigger
					render={
						<Button
							color="neutral"
							variant="quiet"
							size="sm"
							iconOnly
							aria-label="Re-check endpoint status"
							disabled={isFetching}
							onClick={() => void refetch()}
						/>
					}
				>
					<RefreshCwIcon className={cn(isFetching && "animate-spin")} />
				</Tooltip.Trigger>
				<Tooltip.Content>Re-check status</Tooltip.Content>
			</Tooltip.Root>
		</div>
	);
}
