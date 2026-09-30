import { toast } from "#/components/ui/toast";

/** Writes `text` to the clipboard and toasts the outcome. */
export function copyToClipboard(text: string): void {
	navigator.clipboard
		.writeText(text)
		.then(() => toast.add({ title: "Copied to clipboard", type: "success" }))
		.catch(() => toast.add({ title: "Couldn't copy to clipboard", type: "error" }));
}
