import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Alert } from "#/components/ui/alert";
import { Dialog } from "#/components/ui/dialog";
import { Menu } from "#/components/ui/menu";
import { Popover } from "#/components/ui/popover";
import { Select } from "#/components/ui/select";
import { Sheet } from "#/components/ui/sheet";
import { Tabs } from "#/components/ui/tabs";
import { render } from "#/test/utils";

/**
 * Keyboard operation and the ARIA each floating module ends up exposing. These
 * exercise the composed `Content` parts, which the contract test cannot reach
 * because it only renders parts that mount inline.
 */

describe("Select", () => {
	/** `items` is what lets `Select.Value` show a label rather than the raw value. */
	test("opens, picks an option and reflects it on the trigger", async () => {
		await render(
			<Select.Root
				items={[
					{ value: "starter", label: "Starter" },
					{ value: "pro", label: "Pro" },
				]}
			>
				<Select.Trigger aria-label="Plan">
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="starter">Starter</Select.Item>
					<Select.Item value="pro">Pro</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		const trigger = page.getByRole("combobox", { name: "Plan" });
		await expect.element(trigger).toHaveAttribute("aria-expanded", "false");

		await trigger.click();
		await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
		await expect.element(page.getByRole("listbox")).toBeInTheDocument();

		await page.getByRole("option", { name: "Pro" }).click();
		await expect.element(trigger).toHaveTextContent("Pro");
		await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("closes on Escape without choosing", async () => {
		await render(
			<Select.Root>
				<Select.Trigger aria-label="Plan">
					<Select.Value placeholder="Pick one" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="pro">Pro</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		const trigger = page.getByRole("combobox", { name: "Plan" });
		await trigger.click();
		await expect.element(page.getByRole("listbox")).toBeInTheDocument();

		await userEvent.keyboard("{Escape}");
		await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
		await expect.element(trigger).toHaveTextContent("Pick one");
	});
});

describe("Menu", () => {
	test("opens from the trigger and runs the chosen item", async () => {
		const chosen: string[] = [];
		await render(
			<Menu.Root>
				<Menu.Trigger>Actions</Menu.Trigger>
				<Menu.Content>
					<Menu.Item onClick={() => chosen.push("rename")}>Rename</Menu.Item>
					<Menu.Item onClick={() => chosen.push("delete")}>Delete</Menu.Item>
				</Menu.Content>
			</Menu.Root>,
		);

		const trigger = page.getByRole("button", { name: "Actions" });
		await trigger.click();
		await expect.element(page.getByRole("menu")).toBeInTheDocument();

		await page.getByRole("menuitem", { name: "Delete" }).click();
		await expect.poll(() => chosen).toEqual(["delete"]);
		await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("paints a background behind the hovered item", async () => {
		await render(
			<Menu.Root defaultOpen>
				<Menu.Trigger>Actions</Menu.Trigger>
				<Menu.Content>
					<Menu.LinkItem href="#library">Browse the Library</Menu.LinkItem>
				</Menu.Content>
			</Menu.Root>,
		);

		const item = page.getByRole("menuitem", { name: "Browse the Library" });
		await userEvent.hover(item);
		await expect.element(item).toHaveAttribute("data-highlighted");
		await expect.element(item).not.toHaveStyle({ backgroundColor: "rgba(0, 0, 0, 0)" });
	});
});

describe("Dialog", () => {
	test("labels itself from its Title and closes on Escape", async () => {
		await render(
			<Dialog.Root>
				<Dialog.Trigger>Open</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Delete project</Dialog.Title>
						<Dialog.Description>This cannot be undone.</Dialog.Description>
					</Dialog.Header>
				</Dialog.Content>
			</Dialog.Root>,
		);

		await page.getByRole("button", { name: "Open" }).click();

		const dialog = page.getByRole("dialog");
		await expect.element(dialog).toHaveAccessibleName("Delete project");
		await expect.element(dialog).toHaveAccessibleDescription("This cannot be undone.");

		await userEvent.keyboard("{Escape}");
		expect(page.getByRole("dialog").elements()).toHaveLength(0);
	});
});

describe("Popover", () => {
	test("opens from its trigger and closes on Escape", async () => {
		await render(
			<Popover.Root>
				<Popover.Trigger>Details</Popover.Trigger>
				<Popover.Content>
					<Popover.Title>Shipping</Popover.Title>
				</Popover.Content>
			</Popover.Root>,
		);

		const trigger = page.getByRole("button", { name: "Details" });
		await trigger.click();
		await expect.element(page.getByRole("dialog")).toHaveTextContent("Shipping");

		await userEvent.keyboard("{Escape}");
		await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
	});
});

describe("Tabs", () => {
	test("moves between tabs with the arrow keys and swaps the panel", async () => {
		await render(
			<Tabs.Root defaultValue="one">
				<Tabs.List>
					<Tabs.Tab value="one">First</Tabs.Tab>
					<Tabs.Tab value="two">Second</Tabs.Tab>
				</Tabs.List>
				<Tabs.Panel value="one">Panel one</Tabs.Panel>
				<Tabs.Panel value="two">Panel two</Tabs.Panel>
			</Tabs.Root>,
		);

		const first = page.getByRole("tab", { name: "First" });
		await first.click();
		await expect.element(first).toHaveAttribute("aria-selected", "true");
		await expect.element(page.getByRole("tabpanel")).toHaveTextContent("Panel one");

		// Base UI defaults `activateOnFocus` to false, the WAI-ARIA manual-activation
		// pattern: an arrow key moves focus, Enter or Space then selects.
		const second = page.getByRole("tab", { name: "Second" });
		await userEvent.keyboard("{ArrowRight}");
		await expect.element(second).toHaveFocus();
		await expect.element(second).toHaveAttribute("aria-selected", "false");

		await userEvent.keyboard("{Enter}");
		await expect.element(second).toHaveAttribute("aria-selected", "true");
		await expect.element(page.getByRole("tabpanel")).toHaveTextContent("Panel two");
	});

	/** `layout` is a Root-level variant; children read it back off `data-layout`. */
	test("publishes its layout for descendants to read", async () => {
		const { container } = await render(
			<Tabs.Root layout="underline" defaultValue="one">
				<Tabs.List>
					<Tabs.Tab value="one">First</Tabs.Tab>
				</Tabs.List>
			</Tabs.Root>,
		);

		expect(container.querySelector("[data-layout]")?.getAttribute("data-layout")).toBe("underline");
	});
});

describe("Sheet", () => {
	test("slides in from its side, labelled by its Title, and closes from its button", async () => {
		await render(
			<Sheet.Root>
				<Sheet.Trigger>Filters</Sheet.Trigger>
				<Sheet.Content side="left">
					<Sheet.Header>
						<Sheet.Title>Filter models</Sheet.Title>
					</Sheet.Header>
				</Sheet.Content>
			</Sheet.Root>,
		);

		await page.getByRole("button", { name: "Filters" }).click();
		const sheet = page.getByRole("dialog");
		await expect.element(sheet).toHaveAccessibleName("Filter models");
		await expect.element(sheet).toHaveAttribute("data-side", "left");

		await page.getByRole("button", { name: "Close" }).click();
		expect(page.getByRole("dialog").elements()).toHaveLength(0);
	});
});

describe("Alert", () => {
	test("announces itself as an alert", async () => {
		await render(
			<Alert.Root color="danger">
				<Alert.Title>Could not load</Alert.Title>
				<Alert.Description>Try again later.</Alert.Description>
			</Alert.Root>,
		);

		await expect
			.element(page.getByRole("alert"))
			.toHaveTextContent("Could not loadTry again later.");
	});
});
