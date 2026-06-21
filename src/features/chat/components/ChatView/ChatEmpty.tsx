import { Link } from "@tanstack/react-router";
import { BookOpenIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";

/**
 * The conversation's empty state: a prompt to start chatting once a model is
 * connected, or guidance to the Library when none is. `isReady` is whether the
 * conversation has both an endpoint and a model selected.
 */
export function ChatEmpty({ isReady }: { isReady: boolean }) {
	if (isReady) {
		return (
			<Empty className="h-full">
				<EmptyHeader>
					<EmptyDescription>Send a message to start chatting.</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Empty className="h-full">
			<EmptyHeader>
				<EmptyTitle>No model connected yet</EmptyTitle>
				<EmptyDescription>
					Pick a model from the menu below the message box, or install one from the Library.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button asChild>
					<Link to="/library">
						<BookOpenIcon />
						Browse the Library
					</Link>
				</Button>
			</EmptyContent>
		</Empty>
	);
}
