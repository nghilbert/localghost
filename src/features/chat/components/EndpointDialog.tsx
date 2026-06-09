import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, ServerIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import {
	createEndpoint,
	deleteEndpoint,
	endpointsQueryOptions,
} from "#/features/chat/lib/chat.functions";

export function EndpointDialog() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [provider, setProvider] = useState<
		"openai" | "anthropic" | "ollama" | "openrouter" | "groq"
	>("openai");
	const [error, setError] = useState("");

	const queryClient = useQueryClient();
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	const addMutation = useMutation({
		mutationFn: () =>
			createEndpoint({
				data: { name: name.trim(), url: url.trim(), apiKey: apiKey || undefined, provider },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			setName("");
			setUrl("");
			setApiKey("");
			setError("");
		},
		onError: (e) => setError(e instanceof Error ? e.message : "Failed"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["endpoints"] }),
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-1.5">
					<ServerIcon size={14} />
					Providers
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Model Providers</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Existing endpoints */}
					{endpoints.length > 0 && (
						<ul className="space-y-2">
							{endpoints.map((ep) => (
								<li
									key={ep.id}
									className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
								>
									<div>
										<p className="font-medium">{ep.name}</p>
										<p className="truncate text-xs text-muted-foreground">{ep.url}</p>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => deleteMutation.mutate(ep.id)}
									>
										<Trash2Icon size={14} />
									</Button>
								</li>
							))}
						</ul>
					)}

					<Separator />

					{/* Add endpoint form */}
					<div className="space-y-3">
						<p className="text-sm font-medium">Add provider</p>
						<div className="grid grid-cols-2 gap-3">
							<Field>
								<FieldLabel>Name</FieldLabel>
								<Input
									placeholder="My Ollama"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel>Provider</FieldLabel>
								<Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="openai">OpenAI-compatible</SelectItem>
										<SelectItem value="anthropic">Anthropic</SelectItem>
										<SelectItem value="ollama">Ollama</SelectItem>
										<SelectItem value="openrouter">OpenRouter</SelectItem>
										<SelectItem value="groq">Groq</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						</div>
						<Field>
							<FieldLabel>Base URL</FieldLabel>
							<Input
								placeholder="http://localhost:11434"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel>API Key (optional)</FieldLabel>
							<Input
								type="password"
								placeholder="sk-…"
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
							/>
						</Field>
						{error && <FieldError>{error}</FieldError>}
						<Button
							className="w-full gap-1.5"
							disabled={!name.trim() || !url.trim() || addMutation.isPending}
							onClick={() => addMutation.mutate()}
						>
							<PlusIcon size={14} />
							Add provider
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
