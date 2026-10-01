import { describe, expect, it, vi } from "vitest";
import { render } from "#/test/utils";
import { ChatMarkdown } from ".";

describe("ChatMarkdown", () => {
	it("confirms an external link before opening it", async () => {
		const open = vi.spyOn(window, "open").mockReturnValue(null);
		const screen = await render(<ChatMarkdown>{"[Docs](https://example.com)"}</ChatMarkdown>);

		await screen.getByRole("button", { name: "Docs" }).click();
		await expect.element(screen.getByRole("alertdialog")).toHaveTextContent("https://example.com");
		expect(open).not.toHaveBeenCalled();

		await screen.getByRole("button", { name: "Open link" }).click();
		expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noreferrer");
		await expect.element(screen.getByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("copies a code block's text", async () => {
		const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
		const screen = await render(<ChatMarkdown>{"```ts\nconst answer = 42;\n```"}</ChatMarkdown>);

		await expect.element(screen.getByText("ts", { exact: true })).toBeVisible();
		await screen.getByRole("button", { name: "Copy code" }).click();
		expect(writeText).toHaveBeenCalledWith("const answer = 42;");
	});

	it("copies a numbered multi-line block without its line numbers", async () => {
		const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
		const screen = await render(
			<ChatMarkdown>{"```ts\nconst a = 1;\nconst b = 2;\n```"}</ChatMarkdown>,
		);

		await screen.getByRole("button", { name: "Copy code" }).click();
		expect(writeText).toHaveBeenCalledWith("const a = 1;\nconst b = 2;");
	});

	it("shows a fence title once, in the code block header", async () => {
		const screen = await render(
			<ChatMarkdown>{'```ts title="app.ts"\nconst answer = 42;\n```'}</ChatMarkdown>,
		);

		await expect.element(screen.getByText("app.ts", { exact: true })).toBeVisible();
		expect(screen.getByText("app.ts", { exact: true }).elements()).toHaveLength(1);
	});

	it("marks the lines a fence highlights", async () => {
		const screen = await render(
			<ChatMarkdown>{"```ts {2}\nconst a = 1;\nconst b = 2;\n```"}</ChatMarkdown>,
		);

		await expect.element(screen.getByRole("button", { name: "Copy code" })).toBeVisible();
		const highlighted = screen.container.querySelectorAll(".th-line--highlighted");
		expect([...highlighted].map((line) => line.getAttribute("data-line"))).toEqual(["2"]);
	});

	it("drops a trailing empty list item while streaming", async () => {
		const screen = await render(<ChatMarkdown isStreaming>{"- one\n- "}</ChatMarkdown>);

		await expect.element(screen.getByRole("listitem")).toHaveTextContent("one");
		expect(screen.getByRole("listitem").elements()).toHaveLength(1);
	});
});
