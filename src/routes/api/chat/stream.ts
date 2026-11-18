import { createFileRoute } from "@tanstack/react-router";
import { findUserSettings } from "#/features/account/server/user.server";
import { getChatStream, postChatStream } from "#/features/chat/server/stream.server";
import { getModelSetting } from "#/features/library/server/model-setting.server";
import { memoryAdapter } from "#/features/memory/server/adapter.server";
import { authedRequest } from "#/lib/middleware";

export const Route = createFileRoute("/api/chat/stream")({
	server: {
		middleware: [authedRequest],
		handlers: {
			POST: ({ request, context: { userId } }) =>
				postChatStream({ request, userId, findUserSettings, getModelSetting, memoryAdapter }),
			GET: ({ request, context: { userId } }) => getChatStream({ request, userId }),
		},
	},
});
