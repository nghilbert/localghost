import { toast } from "#/components/ui/toast";

/** Writes `text` to the clipboard and toasts the outcome. */
export async function copyToClipboard(text: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		toast.add({ title: "Couldn't copy to clipboard", type: "error" });
		return;
	}
	toast.add({ title: "Copied to clipboard", type: "success" });
}
