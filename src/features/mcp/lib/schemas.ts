import { z } from "zod/v4";

export const MCP_TRANSPORT_VALUES = ["streamable-http", "sse"] as const;

export const MCP_TRANSPORT_OPTIONS = MCP_TRANSPORT_VALUES.map((value) => ({ value, label: value }));

export const AddMcpServerFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
	url: z.url("Must be a valid URL").max(2048),
	type: z.enum(MCP_TRANSPORT_VALUES),
});

export const addMcpServerDefaults: z.infer<typeof AddMcpServerFormSchema> = {
	name: "",
	url: "",
	type: "streamable-http",
};

export const createMcpServerInput = z.object({
	name: z.string().min(1).max(100),
	url: z.url().max(2048),
	type: z.enum(MCP_TRANSPORT_VALUES).default("streamable-http"),
});

export const toCreateMcpServerInput = (
	value: z.infer<typeof AddMcpServerFormSchema>,
): z.input<typeof createMcpServerInput> => ({
	name: value.name.trim(),
	url: value.url.trim(),
	type: value.type,
});

export const updateMcpServerInput = z.object({
	id: z.uuid(),
	name: z.string().min(1).max(100).optional(),
	url: z.url().max(2048).optional(),
	type: z.enum(MCP_TRANSPORT_VALUES).optional(),
	enabled: z.boolean().optional(),
});

export const mcpServerIdInput = z.object({ id: z.uuid() });
