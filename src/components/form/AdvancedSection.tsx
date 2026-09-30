import { ChevronDownIcon } from "lucide-react";
import type { PropsWithChildren } from "react";
import { cn } from "tailwind-variants";
import { Button } from "#/components/ui/button";
import { Collapsible } from "#/components/ui/collapsible";

/** Form fields most people leave alone, folded under an "Advanced" toggle. */
export function AdvancedSection({ children }: PropsWithChildren) {
	return (
		<Collapsible.Root>
			<Collapsible.Trigger
				render={(props, state) => (
					<Button
						{...props}
						type="button"
						color="neutral"
						variant="quiet"
						size="sm"
						className="text-muted-fg"
					>
						<ChevronDownIcon className={cn("transition-transform", state.open && "rotate-180")} />
						Advanced
					</Button>
				)}
			/>
			<Collapsible.Panel>
				<div className="flex flex-col gap-3 pt-2">{children}</div>
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}
