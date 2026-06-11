import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { createMcpServer } from "#/features/mcp/lib/mcp.functions";

type McpServerType = "streamable-http" | "sse";

type McpAddServerFormProps = {
	onCreated: () => void;
};

export function McpAddServerForm({ onCreated }: McpAddServerFormProps) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [type, setType] = useState<McpServerType>("streamable-http");
	const [formError, setFormError] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: createMcpServer,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
			toast.success("MCP server added");
			onCreated();
		},
		onError: (error) => setFormError(error.message),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>New MCP server</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{formError && <p className="text-xs text-destructive">{formError}</p>}
				<Field>
					<FieldLabel htmlFor="mcp-server-name">Name</FieldLabel>
					<Input
						id="mcp-server-name"
						placeholder="My MCP server"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="mcp-server-url">URL</FieldLabel>
					<Input
						id="mcp-server-url"
						placeholder="https://mcp.example.com/mcp"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel>Transport</FieldLabel>
					<ToggleGroup
						type="single"
						value={type}
						onValueChange={(value) => {
							if (value === "streamable-http" || value === "sse") setType(value);
						}}
						variant="outline"
						size="sm"
					>
						<ToggleGroupItem value="streamable-http">streamable-http</ToggleGroupItem>
						<ToggleGroupItem value="sse">sse</ToggleGroupItem>
					</ToggleGroup>
				</Field>
				<Button
					size="sm"
					disabled={!name.trim() || !url.trim() || createMutation.isPending}
					onClick={() => createMutation.mutate({ data: { name, url, type } })}
				>
					{createMutation.isPending ? "Adding…" : "Add"}
				</Button>
			</CardContent>
		</Card>
	);
}
