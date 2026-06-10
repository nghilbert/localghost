import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import {
	addMemory,
	deleteMemory,
	memoriesQueryOptions,
	searchMemories,
} from "#/features/memory/lib/memory.functions";
import { cn } from "#/lib/utils";

const CATEGORIES = ["fact", "preference", "contact", "project", "instruction"] as const;

const CATEGORY_COLORS: Record<(typeof CATEGORIES)[number], string> = {
	fact: "bg-muted text-muted-foreground",
	preference: "bg-secondary text-secondary-foreground",
	contact: "bg-accent text-accent-foreground",
	project: "bg-primary/10 text-primary",
	instruction: "bg-destructive/10 text-destructive",
};

export function MemoryModal() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [newText, setNewText] = useState("");
	const [newCategory, setNewCategory] = useState<(typeof CATEGORIES)[number]>("fact");

	const { data: memories = [] } = useQuery(memoriesQueryOptions());

	const { data: searchResults } = useQuery({
		queryKey: ["memories-search", searchQuery],
		queryFn: () => searchMemories({ data: { query: searchQuery, limit: 10 } }),
		enabled: searchQuery.length > 2,
		staleTime: 5_000,
	});

	const addMutation = useMutation({
		mutationFn: () => addMemory({ data: { text: newText, category: newCategory } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["memories"] });
			setNewText("");
			toast.success("Memory saved");
		},
		onError: () => toast.error("Failed to save memory"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteMemory({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["memories"] });
			toast.success("Memory deleted");
		},
	});

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

				<div className="space-y-2 border-b pb-4">
					<Textarea
						value={newText}
						onChange={(e) => setNewText(e.target.value)}
						placeholder="Add a memory…"
						rows={2}
						className="resize-none"
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
								e.preventDefault();
								addMutation.mutate();
							}
						}}
					/>
					<div className="flex items-center gap-2">
						<Select
							value={newCategory}
							onValueChange={(v) => setNewCategory(v as (typeof CATEGORIES)[number])}
						>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CATEGORIES.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							size="sm"
							onClick={() => addMutation.mutate()}
							disabled={!newText.trim() || addMutation.isPending}
							className="gap-1.5"
						>
							<PlusIcon size={13} />
							{addMutation.isPending ? "Saving…" : "Save"}
						</Button>
						<span className="ml-auto text-xs text-muted-foreground">Ctrl+Enter</span>
					</div>
				</div>

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
										CATEGORY_COLORS[m.category as (typeof CATEGORIES)[number]] ??
											CATEGORY_COLORS.fact,
									)}
								>
									{m.category}
								</Badge>
								<span className="flex-1 text-sm leading-snug">{m.text}</span>
								<Button
									variant="ghost"
									size="icon-sm"
									className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
									onClick={() => deleteMutation.mutate(m.id)}
									disabled={deleteMutation.isPending}
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
