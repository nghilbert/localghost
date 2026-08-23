import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "#/shared/components/ui/message-scroller";
import { render } from "#/test/utils";

const ITEM_HEIGHT = 120;
const VIEWPORT_HEIGHT = 200;

function Harness({
	autoScroll = false,
	defaultScrollPosition = "end",
	initialCount = 4,
	anchorIndex,
	buttonDirection = "end",
}: {
	autoScroll?: boolean;
	defaultScrollPosition?: "start" | "end" | "last-anchor";
	initialCount?: number;
	anchorIndex?: number;
	buttonDirection?: "start" | "end";
}) {
	const [items, setItems] = useState(() =>
		Array.from({ length: initialCount }, (_, index) => ({
			id: `item-${index}`,
			scrollAnchor: index === anchorIndex,
		})),
	);
	const appendItem = (scrollAnchor = false) => {
		setItems((current) => [...current, { id: `item-${current.length}`, scrollAnchor }]);
	};
	return (
		<>
			<button type="button" data-testid="add" onClick={() => appendItem()}>
				add
			</button>
			<button type="button" data-testid="add-anchor" onClick={() => appendItem(true)}>
				add anchor
			</button>
			<MessageScrollerProvider
				autoScroll={autoScroll}
				defaultScrollPosition={defaultScrollPosition}
			>
				<MessageScroller
					data-testid="scroller"
					style={{ position: "relative", height: VIEWPORT_HEIGHT }}
				>
					{/* Tailwind isn't loaded in browser tests, so the scroll container is set
					    with inline styles. This exercises the JS scroll logic, not the classes. */}
					<MessageScrollerViewport
						data-testid="vp"
						style={{ height: VIEWPORT_HEIGHT, overflowY: "auto" }}
					>
						<MessageScrollerContent>
							{items.map((item) => {
								return (
									<MessageScrollerItem
										key={item.id}
										scrollAnchor={item.scrollAnchor}
										data-testid={item.scrollAnchor ? "anchor" : item.id}
										style={{ height: ITEM_HEIGHT }}
									>
										{item.id}
									</MessageScrollerItem>
								);
							})}
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton direction={buttonDirection} data-testid="scroll-btn" />
				</MessageScroller>
			</MessageScrollerProvider>
		</>
	);
}

/** Distance in px from the bottom of the scroll range. */
function distanceFromBottom(vp: Element) {
	return vp.scrollHeight - vp.clientHeight - vp.scrollTop;
}

describe("MessageScroller", () => {
	it("pins to the bottom and stays there as new items append while at the end", async () => {
		const screen = await render(
			<Harness autoScroll defaultScrollPosition="end" initialCount={4} />,
		);
		const vp = () => screen.getByTestId("vp").element();

		// Overflowing content starts scrolled to the bottom.
		await expect.poll(() => distanceFromBottom(vp()), { timeout: 2000 }).toBeLessThan(30);

		// Appending while stuck at the end keeps us pinned to the bottom.
		await screen.getByTestId("add").click();
		await expect.poll(() => distanceFromBottom(vp()), { timeout: 2000 }).toBeLessThan(30);
	});

	it("scrolls back to the end when the end button is clicked", async () => {
		const screen = await render(
			<Harness autoScroll defaultScrollPosition="end" initialCount={5} />,
		);
		const vp = () => screen.getByTestId("vp").element();

		await expect.poll(() => distanceFromBottom(vp()), { timeout: 2000 }).toBeLessThan(30);

		// Scroll away from the end, then the button returns us to it.
		vp().scrollTop = 0;
		await expect.poll(() => distanceFromBottom(vp()), { timeout: 2000 }).toBeGreaterThan(30);
		await screen.getByTestId("scroll-btn").click();
		await expect.poll(() => distanceFromBottom(vp()), { timeout: 2000 }).toBeLessThan(30);
	});

	it("scrolls to the start when the start button is clicked", async () => {
		const screen = await render(
			<Harness defaultScrollPosition="end" initialCount={5} buttonDirection="start" />,
		);
		const vp = () => screen.getByTestId("vp").element();

		await expect.poll(() => vp().scrollTop, { timeout: 2000 }).toBeGreaterThan(0);
		await screen.getByTestId("scroll-btn").click();
		await expect.poll(() => vp().scrollTop, { timeout: 2000 }).toBe(0);
	});

	it("positions the last anchor at the top of the viewport", async () => {
		const screen = await render(
			<Harness defaultScrollPosition="last-anchor" initialCount={4} anchorIndex={3} />,
		);
		const vp = () => screen.getByTestId("vp").element();
		const anchor = () => screen.getByTestId("anchor").element();

		await expect
			.poll(() => anchor().getBoundingClientRect().top - vp().getBoundingClientRect().top, {
				timeout: 2000,
			})
			.toBeLessThan(24);
	});

	it("keeps a manual position until a new anchor is appended", async () => {
		const screen = await render(
			<Harness autoScroll defaultScrollPosition="last-anchor" initialCount={4} anchorIndex={3} />,
		);
		const vp = () => screen.getByTestId("vp").element();

		await expect.poll(() => vp().scrollTop, { timeout: 2000 }).toBeGreaterThan(0);
		vp().dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
		vp().scrollTop = 0;
		await screen.getByTestId("add").click();
		await expect.poll(() => vp().scrollTop, { timeout: 2000 }).toBe(0);

		await screen.getByTestId("add-anchor").click();
		await expect.poll(() => vp().scrollTop, { timeout: 2000 }).toBeGreaterThan(0);
	});
});
