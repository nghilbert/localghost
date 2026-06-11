import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
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
import { Field, FieldError, FieldGroup } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Item, ItemGroup } from "#/components/ui/item";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import {
	addMemory,
	deleteMemory,
	memoriesQueryOptions,
	searchMemories,
} from "#/features/memory/lib/memory.functions";
import { useAppForm } from "#/hooks/use-app-form";
import { cn } from "#/lib/utils";

const CATEGORIES = ["fact", "preference", "contact", "project", "instruction"] as const;

const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({ value: category, label: category }));

const CATEGORY_COLORS: Record<string, string> = {
	fact: "bg-muted text-muted-foreground",
	preference: "bg-secondary text-secondary-foreground",
	contact: "bg-accent text-accent-foreground",
	project: "bg-primary/10 text-primary",
	instruction: "bg-destructive/10 text-destructive",
};

const MemorySchema = z.object({
	text: z.string().trim().min(1, "Memory text is required"),
	category: z.enum(CATEGORIES),
});

const MemoryDefaults: z.infer<typeof MemorySchema> = {
	text: "",
	category: "fact",
};

export function MemoryModal() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [formError, setFormError] = useState<string | null>(null);

	const { data: memories = [] } = useQuery(memoriesQueryOptions());

	const { data: searchResults } = useQuery({
		queryKey: ["memories-search", searchQuery],
		queryFn: () => searchMemories({ data: { query: searchQuery, limit: 10 } }),
		enabled: searchQuery.length > 2,
		staleTime: 5_000,
	});

	const form = useAppForm({
		defaultValues: MemoryDefaults,
		validators: { onDynamic: MemorySchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await addMemory({ data: { text: value.text.trim(), category: value.category } });
				queryClient.invalidateQueries({ queryKey: ["memories"] });
				toast.success("Memory saved");
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to save memory");
			}
		},
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

				<form
					className="border-b pb-4"
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<FieldGroup className="gap-3">
							<form.AppField name="text">
								{(field) => (
									<field.TextareaField
										label="New memory"
										description="Press Ctrl+Enter to save"
										placeholder="Add a memory…"
										rows={2}
										className="resize-none"
										onKeyDown={(event) => {
											if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
												event.preventDefault();
												form.handleSubmit();
											}
										}}
									/>
								)}
							</form.AppField>
							<form.AppField name="category">
								{(field) => <field.SelectField label="Category" options={CATEGORY_OPTIONS} />}
							</form.AppField>
							<FieldError>{formError}</FieldError>
							<Field orientation="horizontal">
								<form.SubmitButton size="sm">
									<PlusIcon size={13} />
									Save
								</form.SubmitButton>
							</Field>
						</FieldGroup>
					</form.AppForm>
				</form>

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
