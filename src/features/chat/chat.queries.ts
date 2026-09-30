import type { ModelMessage } from "@tanstack/ai";
import { queryOptions } from "@tanstack/react-query";
import {
	getConversation,
	getDefaultSelection,
	getModelRunState,
	getToolAvailability,
	listConversations,
	searchConversationsFn,
} from "./chat.functions";
import type { ConversationDetail } from "./chat.types";
import { reviveMessageDates } from "./lib/messages";

/** Query options for conversations. Search keys sit under `list`, so invalidating the list refreshes them. */
export const chatQueries = {
	all: () => ["chat"] as const,
	list: () =>
		queryOptions({
			queryKey: [...chatQueries.all(), "list"],
			queryFn: () => listConversations(),
		}),
	search: (query: string) =>
		queryOptions({
			queryKey: [...chatQueries.all(), "list", "search", query],
			queryFn: () => searchConversationsFn({ data: { query } }),
		}),
	detail: (id: string) =>
		queryOptions({
			queryKey: [...chatQueries.all(), "detail", id],
			// The server function returns `messages` as untyped JSON, so it is typed here.
			queryFn: async (): Promise<ConversationDetail> => {
				const conversation = await getConversation({ data: { id } });
				const messages: Array<ModelMessage> = JSON.parse(JSON.stringify(conversation.messages));
				return { ...conversation, messages: reviveMessageDates(messages) };
			},
		}),
	runState: (id: string) =>
		queryOptions({
			queryKey: [...chatQueries.all(), "detail", id, "run-state"],
			queryFn: () => getModelRunState({ data: { id } }),
		}),
	defaultSelection: () =>
		queryOptions({
			queryKey: [...chatQueries.all(), "default-selection"],
			queryFn: () => getDefaultSelection(),
		}),
	toolAvailability: () =>
		queryOptions({
			queryKey: [...chatQueries.all(), "tool-availability"],
			queryFn: () => getToolAvailability(),
			staleTime: Number.POSITIVE_INFINITY,
		}),
};
