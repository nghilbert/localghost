import { CpuIcon, MemoryStickIcon, MonitorIcon } from "lucide-react";
import { Badge } from "#/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/shared/components/ui/card";
import { Skeleton } from "#/shared/components/ui/skeleton";
import type { HardwareInfo } from "#/shared/domain/model/types";

function gb(n: number) {
	return `${n.toFixed(1)} GB`;
}

type HardwareCardProps = {
	hardware: HardwareInfo | undefined;
	isLoading: boolean;
};

export function HardwareCard({ hardware, isLoading }: HardwareCardProps) {
	if (isLoading) {
		return (
			<div className="grid gap-3 sm:grid-cols-3">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-24 rounded-xl" />
				))}
			</div>
		);
	}

	if (!hardware) return null;

	const bestGpu = hardware.gpus?.reduce<NonNullable<typeof hardware.gpus>[number] | null>(
		(best, g) => (g.totalVramMb > (best?.totalVramMb ?? 0) ? g : best),
		null,
	);

	return (
		<div className="grid gap-3 sm:grid-cols-3">
			<Card>
				<CardHeader className="pb-1 pt-3">
					<CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
						<CpuIcon size={13} />
						CPU
					</CardTitle>
				</CardHeader>
				<CardContent className="pb-3">
					<p className="truncate text-sm font-medium">{hardware.cpuModel}</p>
					<p className="text-xs text-muted-foreground">{hardware.cpuCount} threads</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-1 pt-3">
					<CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
						<MemoryStickIcon size={13} />
						RAM
					</CardTitle>
				</CardHeader>
				<CardContent className="pb-3">
					<p className="text-sm font-medium">{gb(hardware.totalRamGb)} total</p>
					<p className="text-xs text-muted-foreground">{gb(hardware.freeRamGb)} free</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-1 pt-3">
					<CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
						<MonitorIcon size={13} />
						GPU
					</CardTitle>
				</CardHeader>
				<CardContent className="pb-3">
					{bestGpu ? (
						<>
							<p className="truncate text-sm font-medium">{bestGpu.name}</p>
							<p className="text-xs text-muted-foreground">
								{gb(bestGpu.totalVramMb / 1024)} VRAM · {gb(bestGpu.freeVramMb / 1024)} free
							</p>
							{hardware.gpus && hardware.gpus.length > 1 && (
								<Badge variant="secondary" className="mt-1 text-xs">
									+{hardware.gpus.length - 1} more
								</Badge>
							)}
						</>
					) : (
						<>
							<p className="text-sm font-medium text-muted-foreground">No GPU detected</p>
							<p className="text-xs text-muted-foreground">CPU inference only</p>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
