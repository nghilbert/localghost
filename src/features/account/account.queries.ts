import { queryOptions } from "@tanstack/react-query";
import { getSignUpAvailability, getUserSettings } from "./account.functions";

/** Query options for sign-up state and the user's chat defaults. */
export const accountQueries = {
	all: () => ["account"] as const,
	signUpAvailability: () =>
		queryOptions({
			queryKey: [...accountQueries.all(), "sign-up-availability"],
			queryFn: () => getSignUpAvailability(),
		}),
	settings: () =>
		queryOptions({
			queryKey: [...accountQueries.all(), "settings"],
			queryFn: () => getUserSettings(),
		}),
};
