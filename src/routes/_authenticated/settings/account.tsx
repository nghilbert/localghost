import { createFileRoute } from "@tanstack/react-router";
import { accountQueries } from "#/features/account/account.queries";
import { AccountTab } from "./-components/AccountTab";

export const Route = createFileRoute("/_authenticated/settings/account")({
	loader: ({ context }) =>
		context.queryClient.query({ ...accountQueries.settings(), staleTime: "static" }),
	component: AccountTab,
});
