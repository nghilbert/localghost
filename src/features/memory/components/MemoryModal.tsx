import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	addMemory,
	deleteMemory,
	memoriesQueryOptions,
	searchMemories,
} from "#/features/memory/lib/memory.functions";

const CATEGORIES = ["fact", "preference", "contact", "project", "instruction"] as const;

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

	const addMut = useMutation({
		mutationFn: () => addMemory({ data: { text: newText, category: newCategory } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["memories"] });
			setNewText("");
		},
	});

	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteMemory({ data: { id } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["memories"] }),
	});

	const displayed = searchQuery.length > 2 ? (searchResults ?? []) : memories;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-1.5">
					<BrainIcon size={15} />
					Memory
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Memory</DialogTitle>
				</DialogHeader>

				{/* Add memory form */}
				<div className="flex flex-col gap-2 border-b pb-4">
					<textarea
						value={newText}
						onChange={(e) => setNewText(e.target.value)}
						placeholder="Add a memory…"
						rows={2}
						className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
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
							onClick={() => addMut.mutate()}
							disabled={!newText.trim() || addMut.isPending}
							className="gap-1"
						>
							<PlusIcon size={14} />
							Add
						</Button>
					</div>
				</div>

				{/* Search */}
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

				{/* Memory list */}
				<ul className="max-h-72 space-y-1 overflow-y-auto" aria-label="Saved memories">
					{displayed.length === 0 && (
						<li className="py-4 text-center text-sm text-muted-foreground">
							{searchQuery.length > 2 ? "No matching memories." : "No memories yet."}
						</li>
					)}
					{displayed.map((m) => (
						<li
							key={m.id}
							className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
						>
							<span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
								{m.category}
							</span>
							<span className="flex-1 text-sm">{m.text}</span>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => deleteMut.mutate(m.id)}
								disabled={deleteMut.isPending}
								aria-label="Delete memory"
							>
								<Trash2Icon size={13} />
							</Button>
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
