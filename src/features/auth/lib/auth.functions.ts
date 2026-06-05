import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export const getAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { auth } = await import("#/features/auth/lib/auth.server");
	const headers = getRequestHeaders();
	return await auth.api.getSession({ headers });
});

export const authQueryOptions = () =>
	queryOptions({
		queryKey: ["session"],
		queryFn: () => getAuth(),
	});
