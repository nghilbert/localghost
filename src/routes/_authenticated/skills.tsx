import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	createSkill,
	deleteSkill,
	skillsQueryOptions,
	updateSkill,
} from "#/features/skills/lib/skill.functions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/skills")({
	component: SkillsPage,
});

type Skill = {
	id: string;
	name: string;
	description: string;
	content: string;
	updatedAt: Date | string;
};

const BLANK: Omit<Skill, "id" | "updatedAt"> = { name: "", description: "", content: "" };

export default function SkillsPage() {
	const qc = useQueryClient();
	const { data: skills = [] } = useQuery(skillsQueryOptions());

	const [selected, setSelected] = useState<Skill | null>(null);
	const [draft, setDraft] = useState(BLANK);
	const [isNew, setIsNew] = useState(false);

	const invalidate = () => qc.invalidateQueries({ queryKey: ["skills"] });

	const createMut = useMutation({
		mutationFn: () =>
			createSkill({
				data: {
					name: draft.name.trim(),
					description: draft.description.trim() || undefined,
					content: draft.content.trim(),
				},
			}),
		onSuccess: (skill) => {
			invalidate();
			setIsNew(false);
			setSelected(skill as Skill);
			setDraft({ name: skill.name, description: skill.description, content: skill.content });
		},
	});

	const updateMut = useMutation({
		mutationFn: (id: string) =>
			updateSkill({
				data: {
					id,
					name: draft.name.trim(),
					description: draft.description.trim(),
					content: draft.content.trim(),
				},
			}),
		onSuccess: (skill) => {
			invalidate();
			setSelected(skill as Skill);
		},
	});

	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteSkill({ data: { id } }),
		onSuccess: () => {
			invalidate();
			setSelected(null);
			setIsNew(false);
		},
	});

	function selectSkill(skill: Skill) {
		setIsNew(false);
		setSelected(skill);
		setDraft({ name: skill.name, description: skill.description, content: skill.content });
	}

	function startNew() {
		setIsNew(true);
		setSelected(null);
		setDraft(BLANK);
	}

	const isDirty = selected
		? draft.name !== selected.name ||
			draft.description !== selected.description ||
			draft.content !== selected.content
		: false;

	const canSave = isNew
		? draft.name.trim().length > 0 && draft.content.trim().length > 0
		: isDirty && draft.name.trim().length > 0 && draft.content.trim().length > 0;

	return (
		<div className="flex h-full flex-col">
			<PageHeader title="Skills" description="Reusable procedures and instructions for the agent" />

			<div className="flex min-h-0 flex-1">
				{/* List */}
				<div className="flex w-64 shrink-0 flex-col border-r">
					<div className="border-b p-3">
						<Button size="sm" className="w-full gap-1.5" onClick={startNew}>
							<PlusIcon size={14} />
							New skill
						</Button>
					</div>
					<div className="flex-1 overflow-y-auto">
						{skills.length === 0 && !isNew && (
							<p className="px-4 py-6 text-center text-xs text-muted-foreground">
								No skills yet. Create one to give the agent reusable procedures.
							</p>
						)}
						{skills.map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => selectSkill(s as Skill)}
								className={cn(
									"flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
									selected?.id === s.id && "bg-muted font-medium",
								)}
							>
								<span className="truncate">{s.name}</span>
								{s.description && (
									<span className="truncate text-[11px] text-muted-foreground">
										{s.description}
									</span>
								)}
							</button>
						))}
					</div>
				</div>

				{/* Editor */}
				<div className="flex min-w-0 flex-1 flex-col">
					{!selected && !isNew ? (
						<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
							Select a skill or create a new one.
						</div>
					) : (
						<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="skill-name">Name</Label>
									<Input
										id="skill-name"
										value={draft.name}
										onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
										placeholder="e.g. Summarize Text"
										maxLength={100}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="skill-desc">Description</Label>
									<Input
										id="skill-desc"
										value={draft.description}
										onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
										placeholder="When this skill is useful"
										maxLength={500}
									/>
								</div>
							</div>

							<div className="flex flex-1 flex-col space-y-1.5">
								<Label htmlFor="skill-content">Content</Label>
								<textarea
									id="skill-content"
									value={draft.content}
									onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
									placeholder="Describe the procedure, steps, or instructions for this skill…"
									className="flex-1 min-h-[300px] resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
								/>
							</div>

							<div className="flex items-center justify-between">
								{selected && !isNew ? (
									<Button
										variant="destructive"
										size="sm"
										onClick={() => {
											if (confirm(`Delete skill "${selected.name}"?`)) {
												deleteMut.mutate(selected.id);
											}
										}}
										disabled={deleteMut.isPending}
									>
										<Trash2Icon size={14} className="mr-1.5" />
										Delete
									</Button>
								) : (
									<div />
								)}

								<Button
									size="sm"
									disabled={!canSave || createMut.isPending || updateMut.isPending}
									onClick={() =>
										isNew ? createMut.mutate() : selected && updateMut.mutate(selected.id)
									}
								>
									{isNew ? "Create skill" : "Save changes"}
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
