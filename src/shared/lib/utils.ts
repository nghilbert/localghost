import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Strips Ollama's implicit `:latest` so a bare model name and its tagged form match. */
export function normalizeModelId(id: string): string {
	return id.replace(/:latest$/, "");
}
