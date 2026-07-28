function splitModelId(id: string): string[] {
	let parts = [id];
	for (const delimiter of "-._/") {
		parts = parts.flatMap((part) => part.split(delimiter));
	}
	return parts.filter((part) => part.length > 0);
}

function parseMoeToken(token: string): number | null {
	const lower = token.toLowerCase();
	if (!lower.endsWith("b") || lower.length < 2) return null;
	const value = lower.slice(0, -1);
	const xIndex = value.indexOf("x");
	if (xIndex <= 0 || xIndex >= value.length - 1) return null;
	const experts = Number(value.slice(0, xIndex));
	const sizeB = Number(value.slice(xIndex + 1));
	if (Number.isNaN(experts) || Number.isNaN(sizeB)) return null;
	return experts * sizeB;
}

/** Billions of parameters parsed from a Hugging Face repo id or GGUF filename. */
export function parseParamB(id: string): number | null {
	for (const token of splitModelId(id)) {
		const moe = parseMoeToken(token);
		if (moe !== null) return moe;

		const lower = token.toLowerCase();
		if (lower.endsWith("b") && lower.length > 1) {
			const value = Number(lower.slice(0, -1));
			if (!Number.isNaN(value)) return value;
		}
		if (lower.endsWith("m") && lower.length > 1) {
			const value = Number(lower.slice(0, -1));
			if (!Number.isNaN(value)) return value / 1000;
		}
	}
	return null;
}
