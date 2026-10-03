import {
	ClipboardListIcon,
	FilesIcon,
	FileTextIcon,
	MemoryStickIcon,
	MessageSquareTextIcon,
	ServerOffIcon,
	TextSearchIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { SpinningBulbIcon } from "./BulbIcons";

/** What a live row says while the model works, and the icon beside it. */
export type ActivityStatus = { label: string; icon: ComponentType };

/** Every live row shown while the model works between steps. A tool call labels its own row. */
export const ACTIVITY_STATUS = {
	loadingModel: { label: "Loading the model into memory", icon: MemoryStickIcon },
	serverUnreachable: {
		label: "Waiting for the model server, which isn't responding",
		icon: ServerOffIcon,
	},
	readingMessage: { label: "Reading your message", icon: MessageSquareTextIcon },
	readingPage: { label: "Reading the page", icon: FileTextIcon },
	readingPages: { label: "Reading the pages", icon: FilesIcon },
	readingSearchResults: { label: "Reading the search results", icon: TextSearchIcon },
	readingResults: { label: "Reading the results", icon: ClipboardListIcon },
	thinking: { label: "Thinking", icon: SpinningBulbIcon },
} satisfies Record<string, ActivityStatus>;
