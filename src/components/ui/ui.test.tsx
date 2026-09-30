import { createRef, type ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { Alert } from "#/components/ui/alert";
import { AlertDialog } from "#/components/ui/alert-dialog";
import { Avatar } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { ButtonLink } from "#/components/ui/button-link";
import { Card } from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { Collapsible } from "#/components/ui/collapsible";
import { Combobox } from "#/components/ui/combobox";
import { ContextMenu } from "#/components/ui/context-menu";
import { Dialog } from "#/components/ui/dialog";
import { Empty } from "#/components/ui/empty";
import { Field } from "#/components/ui/field";
import { Fieldset } from "#/components/ui/fieldset";
import { Form } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { InputGroup } from "#/components/ui/input-group";
import { Item } from "#/components/ui/item";
import { Menu } from "#/components/ui/menu";
import { NumberField } from "#/components/ui/number-field";
import { Pagination } from "#/components/ui/pagination";
import { Popover } from "#/components/ui/popover";
import { Progress } from "#/components/ui/progress";
import { Radio } from "#/components/ui/radio";
import { RadioGroup } from "#/components/ui/radio-group";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Select } from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Sheet } from "#/components/ui/sheet";
import { Sidebar } from "#/components/ui/sidebar";
import { Skeleton } from "#/components/ui/skeleton";
import { Slider } from "#/components/ui/slider";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import { Tabs } from "#/components/ui/tabs";
import { Textarea } from "#/components/ui/textarea";
import { Toggle } from "#/components/ui/toggle";
import { ToggleGroup } from "#/components/ui/toggle-group";
import { Tooltip } from "#/components/ui/tooltip";
import { render } from "#/test/utils";

/**
 * The invariants every module in this library shares, checked once per module
 * instead of once per part.
 *
 * Nothing here asserts a class name, which would only assert a recipe back to
 * itself. What is asserted is the wiring a caller depends on: that their own
 * `className` arrives and beats the recipe's, that a `ref` reaches a real DOM
 * node, that unknown props pass through, and that `render` swaps the element.
 *
 * Every row is a part that renders inline. Popups are covered by the behavior
 * tests, which have to open them first.
 */

const PROBE = "ui-contract-probe";

type Row = {
	/** Anything the part needs around it: a Root for context, a list for a tab. */
	element: (props: Record<string, unknown>) => ReactNode;
	/** Omitted when the part is a native control that cannot become a `<article>`. */
	swapsElement?: false;
};

const MODULES: Record<string, Row> = {
	"alert-dialog": {
		element: (props) => (
			<AlertDialog.Root>
				<AlertDialog.Trigger {...props} />
			</AlertDialog.Root>
		),
	},
	alert: { element: (props) => <Alert.Root {...props} /> },
	avatar: { element: (props) => <Avatar.Root {...props} /> },
	badge: { element: (props) => <Badge {...props} /> },
	button: { element: (props) => <Button {...props} /> },
	"button-link": { element: (props) => <ButtonLink href="#" {...props} /> },
	"button-group": { element: (props) => <ButtonGroup {...props} /> },
	card: { element: (props) => <Card.Root {...props} /> },
	checkbox: { element: (props) => <Checkbox {...props} />, swapsElement: false },
	collapsible: {
		element: (props) => (
			<Collapsible.Root>
				<Collapsible.Trigger {...props} />
			</Collapsible.Root>
		),
	},
	combobox: {
		element: (props) => (
			<Combobox.Root>
				<Combobox.Input {...props} />
			</Combobox.Root>
		),
		swapsElement: false,
	},
	"context-menu": {
		element: (props) => (
			<ContextMenu.Root>
				<ContextMenu.Trigger {...props} />
			</ContextMenu.Root>
		),
	},
	dialog: {
		element: (props) => (
			<Dialog.Root>
				<Dialog.Trigger {...props} />
			</Dialog.Root>
		),
	},
	empty: { element: (props) => <Empty.Root {...props} /> },
	field: { element: (props) => <Field.Root {...props} /> },
	fieldset: { element: (props) => <Fieldset.Root {...props} /> },
	form: { element: (props) => <Form {...props} />, swapsElement: false },
	input: { element: (props) => <Input {...props} />, swapsElement: false },
	"input-group": { element: (props) => <InputGroup.Root {...props} /> },
	item: { element: (props) => <Item.Root {...props} /> },
	menu: {
		element: (props) => (
			<Menu.Root>
				<Menu.Trigger {...props} />
			</Menu.Root>
		),
	},
	"number-field": {
		element: (props) => (
			<NumberField.Root>
				<NumberField.Input {...props} />
			</NumberField.Root>
		),
		swapsElement: false,
	},
	pagination: { element: (props) => <Pagination.Root {...props} /> },
	popover: {
		element: (props) => (
			<Popover.Root>
				<Popover.Trigger {...props} />
			</Popover.Root>
		),
	},
	progress: { element: (props) => <Progress.Root value={40} {...props} /> },
	radio: {
		element: (props) => (
			<RadioGroup defaultValue="one">
				<Radio value="one" {...props} />
			</RadioGroup>
		),
	},
	"radio-group": { element: (props) => <RadioGroup {...props} /> },
	"scroll-area": { element: (props) => <ScrollArea.Root {...props} /> },
	select: {
		element: (props) => (
			<Select.Root>
				<Select.Trigger {...props} />
			</Select.Root>
		),
	},
	separator: { element: (props) => <Separator {...props} /> },
	sheet: {
		element: (props) => (
			<Sheet.Root>
				<Sheet.Trigger {...props} />
			</Sheet.Root>
		),
	},
	sidebar: {
		element: (props) => (
			<Sidebar.Provider>
				<Sidebar.MenuButton {...props} />
			</Sidebar.Provider>
		),
	},
	skeleton: { element: (props) => <Skeleton {...props} /> },
	slider: { element: (props) => <Slider {...props} /> },
	spinner: { element: (props) => <Spinner {...props} />, swapsElement: false },
	switch: { element: (props) => <Switch {...props} /> },
	tabs: { element: (props) => <Tabs.Root {...props} /> },
	textarea: { element: (props) => <Textarea {...props} />, swapsElement: false },
	toggle: { element: (props) => <Toggle {...props} /> },
	"toggle-group": { element: (props) => <ToggleGroup {...props} /> },
	tooltip: {
		element: (props) => (
			<Tooltip.Root>
				<Tooltip.Trigger {...props} />
			</Tooltip.Root>
		),
	},
};

const rows = Object.entries(MODULES);

describe.each(rows)("%s", (_name, row) => {
	test("puts the caller's className on the element", async () => {
		const { container } = await render(row.element({ className: PROBE }));
		expect(container.querySelector(`.${PROBE}`)).not.toBeNull();
	});

	test("forwards a ref to that same element", async () => {
		const ref = createRef<HTMLElement>();
		const { container } = await render(row.element({ className: PROBE, ref }));
		expect(ref.current).toBe(container.querySelector(`.${PROBE}`));
	});

	test("passes an unknown prop through to the DOM", async () => {
		const { container } = await render(row.element({ className: PROBE, "data-probe": "yes" }));
		expect(container.querySelector(`.${PROBE}`)?.getAttribute("data-probe")).toBe("yes");
	});
});

describe.each(rows.filter(([, row]) => row.swapsElement !== false))(
	"%s render prop",
	(_name, row) => {
		test("replaces the default element", async () => {
			const { container } = await render(row.element({ className: PROBE, render: <article /> }));
			expect(container.querySelector(`.${PROBE}`)?.tagName).toBe("ARTICLE");
		});
	},
);

/**
 * The one merge rule the library promises: a caller's class beats the recipe's,
 * because `mergeClassName` runs the pair through tailwind-merge rather than
 * concatenating them. Base UI's own `className` merging concatenates, and would
 * leave the recipe's class last and therefore winning.
 */
describe("className precedence", () => {
	test("a caller's radius replaces the recipe's", async () => {
		const { container } = await render(<Button className="rounded-full">Save</Button>);
		expect(container.querySelector("button.rounded-full:not(.rounded-md)")).not.toBeNull();
	});

	test("a caller's height replaces the size variant's", async () => {
		const { container } = await render(
			<Button size="lg" className="h-20">
				Save
			</Button>,
		);
		expect(container.querySelector("button.h-20:not(.h-9)")).not.toBeNull();
	});

	/**
	 * Base UI parts type `className` as `string | ((state) => string)`. The
	 * function form has to survive `mergeClassName`, which cannot hand a function
	 * to a `tv` recipe and so must return one of its own.
	 */
	test("a className function still receives the part's state", async () => {
		const { container } = await render(
			<Button disabled className={(state) => (state.disabled ? PROBE : "")}>
				Save
			</Button>,
		);
		expect(container.querySelector(`.${PROBE}`)?.tagName).toBe("BUTTON");
	});
});

describe("ButtonLink", () => {
	const DRAWN = [
		"display",
		"height",
		"padding-left",
		"color",
		"background-color",
		"border-color",
		"border-radius",
		"font-size",
		"font-weight",
		"text-decoration-line",
	];

	test.each([
		{},
		{ color: "neutral", variant: "outlined", size: "sm" },
		{ color: "danger", variant: "quiet", size: "lg" },
	] as const)("draws the same as a Button with %o", async (variants) => {
		const { container } = await render(
			<>
				<Button {...variants}>Go</Button>
				<ButtonLink href="#" {...variants}>
					Go
				</ButtonLink>
			</>,
		);
		const button = container.querySelector("button");
		const link = container.querySelector("a");
		if (!button || !link) throw new Error("expected a button and a link");
		// A color transition can still be running on mount, and its computed value is
		// written in another color space until it ends.
		for (const animation of document.getAnimations()) animation.finish();

		const drawn = (element: Element) => {
			const style = getComputedStyle(element);
			return DRAWN.map((property) => style.getPropertyValue(property));
		};
		expect(drawn(link)).toEqual(drawn(button));
	});
});
