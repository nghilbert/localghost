import { CircleAlertIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { useFormContext } from "./context";

export function FormError({ children }: { children?: ReactNode }) {
	if (!children) return null;

	return (
		<Alert variant="destructive">
			<CircleAlertIcon />
			<AlertDescription>{children}</AlertDescription>
		</Alert>
	);
}

export function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
	const { Subscribe } = useFormContext();

	return (
		<Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button type="submit" disabled={isSubmitting} {...props}>
					{isSubmitting && <Spinner data-icon="inline-start" />}
					{children}
				</Button>
			)}
		</Subscribe>
	);
}
