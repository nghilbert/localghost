import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import { Item, ItemContent, ItemDescription, ItemTitle } from "#/components/ui/item";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Spinner } from "#/components/ui/spinner";
import { searchConversations } from "#/features/chat/lib/conversation.functions";

type SearchDialogProps = {
	open: boolean;
	onClose: () => void;
};

export function SearchDialog({ open, onClose }: SearchDialogProps) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");

	const trimmed = query.trim();
	const { data: results = [], isFetching } = useQuery({
		queryKey: ["conversation-search", trimmed],
		queryFn: () => searchConversations({ data: { query: trimmed } }),
		enabled: trimmed.length > 0,
		placeholderData: keepPreviousData,
	});

	function handleOpenConversation(conversationId: string) {
		navigate({ to: "/chat/$conversationId", params: { conversationId } });
		onClose();
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Search chats</DialogTitle>
					<DialogDescription>Find messages across all your conversations.</DialogDescription>
				</DialogHeader>
				<InputGroup>
					<InputGroupAddon>
						<SearchIcon size={14} />
					</InputGroupAddon>
					<InputGroupInput
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search messages…"
					/>
					{query && (
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								aria-label="Clear search"
								onClick={() => setQuery("")}
							>
								<XIcon size={13} />
							</InputGroupButton>
						</InputGroupAddon>
					)}
				</InputGroup>
				<ScrollArea className="max-h-80">
					<div className="space-y-1">
						{isFetching && (
							<p className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
								<Spinner className="size-3" />
								Searching…
							</p>
						)}
						{!isFetching && results.length === 0 && trimmed && (
							<p className="py-4 text-center text-xs text-muted-foreground">No results</p>
						)}
						{results.map((result) => (
							<Item key={result.id} asChild size="sm" className="cursor-pointer hover:bg-muted">
								<button type="button" onClick={() => handleOpenConversation(result.id)}>
									<ItemContent className="gap-0.5">
										<ItemDescription className="text-xs font-medium">
											{result.title}
										</ItemDescription>
										<ItemTitle className="block w-full truncate font-normal">
											{result.snippet}
										</ItemTitle>
									</ItemContent>
								</button>
							</Item>
						))}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
