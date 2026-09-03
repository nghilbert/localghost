import { defineContract } from "@prisma/orm-postgres/contract-builder";
import { defineAccountModel } from "./account.ts";
import {
	defineChatInterruptModel,
	defineChatRunModel,
	defineChatThreadModel,
} from "./chat-persistence.ts";
import { defineCodeAgentSessionModel } from "./code-agent.ts";
import { defineConversationModel } from "./conversation.ts";
import { defineEndpointModel } from "./endpoint.ts";
import { defineMemoryModel } from "./memory.ts";
import { defineModelSettingModel } from "./model-setting.ts";
import { defineSessionModel } from "./session.ts";
import { defineUserModel } from "./user.ts";
import { defineVerificationModel } from "./verification.ts";

export const contract = defineContract({}, (helpers) => {
	const User = defineUserModel(helpers);
	const Session = defineSessionModel(helpers, { User });
	const Account = defineAccountModel(helpers, { User });
	const Verification = defineVerificationModel(helpers);
	const Endpoint = defineEndpointModel(helpers, { User });
	const Conversation = defineConversationModel(helpers, { User, Endpoint });
	const Memory = defineMemoryModel(helpers, { User });
	const ModelSetting = defineModelSettingModel(helpers, { User, Endpoint });
	const ChatThread = defineChatThreadModel(helpers);
	const ChatRun = defineChatRunModel(helpers);
	const ChatInterrupt = defineChatInterruptModel(helpers);
	const CodeAgentSession = defineCodeAgentSessionModel(helpers, { User, Endpoint });

	return {
		models: {
			User,
			Session,
			Account,
			Verification,
			Endpoint,
			Conversation,
			Memory,
			ModelSetting,
			ChatThread,
			ChatRun,
			ChatInterrupt,
			CodeAgentSession,
		},
	};
});
