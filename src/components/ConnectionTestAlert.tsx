import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";

type ConnectionTestAlertProps = {
	ok: boolean;
	title: string;
	description: string;
};

/** Inline result of a "Test connection" action — success or destructive failure. */
export function ConnectionTestAlert({ ok, title, description }: ConnectionTestAlertProps) {
	return (
		<Alert variant={ok ? "default" : "destructive"}>
			{ok ? <CheckCircle2Icon className="text-success" /> : <CircleAlertIcon />}
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{description}</AlertDescription>
		</Alert>
	);
}
