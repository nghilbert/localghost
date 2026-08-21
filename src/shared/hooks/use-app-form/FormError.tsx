import { CircleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "#/shared/components/ui/alert";

export function FormError({ children }: { children?: ReactNode }) {
	if (!children) return null;

	return (
		<Alert variant="destructive" data-testid="form-error">
			<CircleAlertIcon />
			<AlertDescription>{children}</AlertDescription>
		</Alert>
	);
}
