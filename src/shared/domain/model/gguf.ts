import { z } from "zod/v4";

export const ggufQuantSchema = z.enum([
	"Q2_K",
	"Q3_K_S",
	"Q3_K_M",
	"Q3_K_L",
	"Q4_0",
	"Q4_K_S",
	"Q4_K_M",
	"Q5_K_S",
	"Q5_K_M",
	"Q6_K",
	"Q8_0",
	"IQ2_M",
	"IQ3_M",
	"IQ4_XS",
	"IQ4_NL",
	"MXFP4",
	"MXFP4_MOE",
	"TQ1_0",
	"TQ2_0",
	"F16",
	"F32",
	"BF16",
]);
/** Every GGUF quant name llama.cpp produces. */
export const GGUF_QUANTS = ggufQuantSchema.options;
export type GgufQuant = z.infer<typeof ggufQuantSchema>;

const QUANTS_LONGEST_FIRST = [...GGUF_QUANTS].sort((a, b) => b.length - a.length);

function splitOnDelimiters(text: string, delimiters: string): string[] {
	let parts = [text];
	for (const delimiter of delimiters) {
		parts = parts.flatMap((part) => part.split(delimiter));
	}
	return parts.filter((part) => part.length > 0);
}

/** Parses a known GGUF quant from a filename. */
export function parseQuantFromFilename(fileName: string): GgufQuant | null {
	const tokens = splitOnDelimiters(fileName.toUpperCase(), "-.");
	return QUANTS_LONGEST_FIRST.find((quant) => tokens.includes(quant)) ?? null;
}

/** True for a multimodal projector file, never a chat model's own weights. */
export function isMmprojFile(fileName: string): boolean {
	const segments = fileName.split("/");
	const basename = segments[segments.length - 1] ?? fileName;
	return basename.toLowerCase().startsWith("mmproj-");
}

/** The shard information from a `{prefix}-{part}-of-{total}.gguf` filename. */
export function parseShardParts(
	fileName: string,
): { prefix: string; part: number; total: number } | null {
	if (!fileName.toLowerCase().endsWith(".gguf")) return null;
	const tokens = fileName.slice(0, -".gguf".length).split("-");
	const ofIndex = tokens.indexOf("of");
	if (ofIndex < 2) return null;
	const part = Number(tokens[ofIndex - 1]);
	const total = Number(tokens[ofIndex + 1]);
	if (!Number.isInteger(part) || !Number.isInteger(total)) return null;
	return { prefix: tokens.slice(0, ofIndex - 1).join("-"), part, total };
}
