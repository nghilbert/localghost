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
import { Spinner } from "#/components/ui/spinner";
import { searchConversations } from "#/features/chat/lib/conversation.functions";

type SearchResult = {
	id: string;
	title: string;
	snippet: string;
	updatedAt: Date | string;
};

type SearchDialogProps = {
	open: boolean;
	onClose: () => void;
};

export function SearchDialog({ open, onClose }: SearchDialogProps) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	async function handleSearch(nextQuery: string) {
		setQuery(nextQuery);
		if (!nextQuery.trim()) {
			setResults([]);
			return;
		}
		setIsSearching(true);
		try {
			const res = await searchConversations({ data: { query: nextQuery } });
			setResults(res);
		} catch {
			setResults([]);
		} finally {
			setIsSearching(false);
		}
	}

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
						onChange={(e) => handleSearch(e.target.value)}
						placeholder="Search messages…"
					/>
					{query && (
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								aria-label="Clear search"
								onClick={() => {
									setQuery("");
									setResults([]);
								}}
							>
								<XIcon size={13} />
							</InputGroupButton>
						</InputGroupAddon>
					)}
				</InputGroup>
				<div className="max-h-80 space-y-1 overflow-auto">
					{isSearching && (
						<p className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
							<Spinner className="size-3" />
							Searching…
						</p>
					)}
					{!isSearching && results.length === 0 && query && (
						<p className="py-4 text-center text-xs text-muted-foreground">No results</p>
					)}
					{results.map((result) => (
						<Item key={result.id} asChild size="sm" className="cursor-pointer hover:bg-muted">
							<button type="button" onClick={() => handleOpenConversation(result.id)}>
								<ItemContent className="gap-0.5">
									<ItemDescription className="text-xs font-medium">{result.title}</ItemDescription>
									<ItemTitle className="block w-full truncate font-normal">
										{result.snippet}
									</ItemTitle>
								</ItemContent>
							</button>
						</Item>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
