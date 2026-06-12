import { ExternalLinkIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";

export function ManualInstallCard({ onBack }: { onBack: () => void }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Install Ollama yourself</CardTitle>
				<CardDescription>
					Download and run Ollama from the official site. No configuration needed here — this page
					checks for it automatically and continues as soon as it's running.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex items-center gap-4">
				<Button asChild>
					<a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
						<ExternalLinkIcon />
						Get Ollama from ollama.com
					</a>
				</Button>
				<span className="flex items-center gap-2 text-muted-foreground text-sm">
					<Spinner />
					Waiting for Ollama…
				</span>
			</CardContent>
			<CardFooter>
				<Button variant="ghost" onClick={onBack}>
					Back
				</Button>
			</CardFooter>
		</Card>
	);
}
