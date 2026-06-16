import { BrainIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Item, ItemGroup } from "#/components/ui/item";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { AddMemoryForm } from "#/features/memory/components/AddMemoryForm";
import { useMemories } from "#/features/memory/hooks/use-memories";
import { cn } from "#/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
	fact: "bg-muted text-muted-foreground",
	preference: "bg-secondary text-secondary-foreground",
	contact: "bg-accent text-accent-foreground",
	project: "bg-primary/10 text-primary",
	instruction: "bg-destructive/10 text-destructive",
};

export function MemoryDialog() {
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const { memories, searchResults, deleteMemory } = useMemories(searchQuery);

	const displayed = searchQuery.length > 2 ? (searchResults ?? []) : memories;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DialogTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Memory">
							<BrainIcon size={15} />
						</Button>
					</DialogTrigger>
				</TooltipTrigger>
				<TooltipContent>Memory</TooltipContent>
			</Tooltip>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<BrainIcon size={16} />
						Memory
						<span className="ml-auto text-xs font-normal text-muted-foreground">
							{memories.length} saved
						</span>
					</DialogTitle>
					<DialogDescription>
						Store facts and preferences the agent can recall during conversations.
					</DialogDescription>
				</DialogHeader>

				<AddMemoryForm />

				<div className="relative">
					<SearchIcon
						size={14}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search memories…"
						className="pl-8"
					/>
				</div>

				<ScrollArea className="max-h-64">
					<ItemGroup>
						{displayed.length === 0 && (
							<p className="py-6 text-center text-sm text-muted-foreground">
								{searchQuery.length > 2 ? "No matching memories." : "No memories yet."}
							</p>
						)}
						{displayed.map((m) => (
							<Item key={m.id} variant="default" className="group items-start hover:bg-muted/40">
								<Badge
									variant="outline"
									className={cn(
										"mt-0.5 shrink-0 border-transparent",
										CATEGORY_COLORS[m.category] ?? CATEGORY_COLORS.fact,
									)}
								>
									{m.category}
								</Badge>
								<span className="flex-1 text-sm leading-snug">{m.text}</span>
								<Button
									variant="ghost"
									size="icon-sm"
									className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
									onClick={() => deleteMemory.mutate(m.id)}
									disabled={deleteMemory.isPending}
									aria-label="Delete memory"
								>
									<Trash2Icon size={12} />
								</Button>
							</Item>
						))}
					</ItemGroup>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
