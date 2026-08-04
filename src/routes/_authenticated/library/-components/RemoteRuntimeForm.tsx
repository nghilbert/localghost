import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { RuntimeConnectionForm } from "#/shared/domain/model/RuntimeConnectionForm";

export function RemoteRuntimeForm({ onBack }: { onBack: () => void }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Connect to llama.cpp at a URL</CardTitle>
				<CardDescription>
					Point at a llama-server instance by URL: a homelab server, another machine, or a custom
					port. Make sure it listens on the network there (--host 0.0.0.0).
				</CardDescription>
			</CardHeader>
			<CardContent>
				<RuntimeConnectionForm defaultUrl="" submitLabel="Connect" onCancel={onBack} />
			</CardContent>
		</Card>
	);
}
