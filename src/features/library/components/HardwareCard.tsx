import { CpuIcon, GpuIcon, type LucideIcon, MemoryStickIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Card } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { bestGpu } from "#/features/library/lib/hardware-fit";
import type { HardwareInfo } from "#/features/library/library.types";
import { formatBytes, GIB, MIB } from "#/lib/format";

type HardwareStatProps = {
	icon: LucideIcon;
	label: string;
	/** Undefined while loading, which shows skeletons. */
	value: string | undefined;
	detail: string | undefined;
	extra?: string | undefined;
};

function HardwareStat({ icon: Icon, label, value, detail, extra }: HardwareStatProps) {
	return (
		<Card.Root size="sm">
			<Card.Header>
				<Card.Description className="flex items-center gap-1.5 uppercase tracking-wide">
					<Icon />
					{label}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{value === undefined ? (
					<>
						<Skeleton className="h-4 w-32" />
						<Skeleton className="mt-1 h-3 w-20" />
					</>
				) : (
					<>
						<p className="truncate font-medium">{value}</p>
						<p className="text-xs text-muted-fg tabular-nums">{detail}</p>
						{extra && <Badge className="mt-1">{extra}</Badge>}
					</>
				)}
			</Card.Content>
		</Card.Root>
	);
}

type HardwareCardProps = {
	hardware: HardwareInfo | undefined;
	isLoading: boolean;
};

/** The host's CPU, RAM, and GPU. Values show skeletons while loading. */
export function HardwareCard({ hardware, isLoading }: HardwareCardProps) {
	if (!isLoading && !hardware) return null;

	const gpus = hardware?.gpus ?? [];
	const gpu = hardware ? bestGpu({ hardware, key: "totalVramMb" }) : null;

	return (
		<div className="grid gap-3 sm:grid-cols-3">
			<HardwareStat
				icon={CpuIcon}
				label="CPU"
				value={hardware?.cpuModel}
				detail={hardware && `${hardware.cpuCount} threads`}
			/>
			<HardwareStat
				icon={MemoryStickIcon}
				label="RAM"
				value={hardware && `${formatBytes(hardware.totalRamGb * GIB)} total`}
				detail={hardware && `${formatBytes(hardware.freeRamGb * GIB)} free`}
			/>
			<HardwareStat
				icon={GpuIcon}
				label="GPU"
				value={hardware && (gpu?.name ?? "No GPU detected")}
				detail={
					hardware &&
					(gpu
						? `${formatBytes(gpu.totalVramMb * MIB)} VRAM · ${formatBytes(gpu.freeVramMb * MIB)} free`
						: "CPU inference only")
				}
				extra={gpus.length > 1 ? `+${gpus.length - 1} more` : undefined}
			/>
		</div>
	);
}
