import { LightbulbIcon } from "lucide-react";

/** Lucide's lightbulb, spinning, for the model while it thinks. */
export function SpinningBulbIcon() {
	return <LightbulbIcon className="animate-spin motion-reduce:animate-none" />;
}

/** Lucide's lightbulb with rays around its head, for reasoning that has finished. */
export function LitBulbIcon() {
	// Lucide stops hiding an icon from screen readers once it has children, and the rays sit
	// outside its canvas.
	return (
		<LightbulbIcon aria-hidden className="overflow-visible">
			<path d="M12-1v-3M5.64 1.64l-2.12-2.12M18.36 1.64l2.12-2.12M3 8H0M21 8h3" />
		</LightbulbIcon>
	);
}
