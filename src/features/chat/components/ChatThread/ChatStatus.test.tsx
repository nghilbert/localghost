import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "#/test/utils";
import { ChatStatus } from "./ChatStatus";

describe("ChatStatus", () => {
	it("shows a loading row while the transcript hydrates", async () => {
		await render(
			<ChatStatus
				status="ready"
				isHydrating
				messages={[]}
				error={undefined}
				onRetry={vi.fn<ComponentProps<typeof ChatStatus>["onRetry"]>()}
			/>,
		);

		await expect.element(page.getByRole("status")).toHaveTextContent("Loading the conversation");
	});

	it("shows nothing once hydrated with nothing pending", async () => {
		await render(
			<ChatStatus
				status="ready"
				isHydrating={false}
				messages={[]}
				error={undefined}
				onRetry={vi.fn<ComponentProps<typeof ChatStatus>["onRetry"]>()}
			/>,
		);

		await expect.element(page.getByRole("status")).not.toBeInTheDocument();
	});
});
