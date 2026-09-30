import { CircleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A non-field failure (e.g. an unexpected server error), as a live region. */
export function FormError({ children }: { children?: ReactNode }) {
	if (!children) return null;

	return (
		<div
			role="alert"
			className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
		>
			<CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
			<div>{children}</div>
		</div>
	);
}
