import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { SkillEditor } from "#/features/skills/components/SkillEditor";
import { SkillList } from "#/features/skills/components/SkillList";
import {
	createSkill,
	deleteSkill,
	skillsQueryOptions,
	updateSkill,
} from "#/features/skills/lib/skill.functions";
import { BLANK_SKILL, type Skill, type SkillDraft } from "#/features/skills/lib/types";

export const Route = createFileRoute("/_authenticated/skills")({
	component: SkillsPage,
});

function SkillsPage() {
	const queryClient = useQueryClient();
	const { data: skills = [] } = useQuery(skillsQueryOptions());

	const [selected, setSelected] = useState<Skill | null>(null);
	const [draft, setDraft] = useState<SkillDraft>(BLANK_SKILL);
	const [isNew, setIsNew] = useState(false);

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["skills"] });

	const createMutation = useMutation({
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

	const updateMutation = useMutation({
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

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteSkill({ data: { id } }),
		onSuccess: () => {
			invalidate();
			setSelected(null);
			setIsNew(false);
		},
	});

	function handleSelectSkill(skill: Skill) {
		setIsNew(false);
		setSelected(skill);
		setDraft({ name: skill.name, description: skill.description, content: skill.content });
	}

	function handleNew() {
		setIsNew(true);
		setSelected(null);
		setDraft(BLANK_SKILL);
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
				<SkillList
					skills={skills as Skill[]}
					selectedId={selected?.id ?? null}
					isNew={isNew}
					onSelect={handleSelectSkill}
					onNew={handleNew}
				/>
				<div className="flex min-w-0 flex-1 flex-col">
					{!selected && !isNew ? (
						<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
							Select a skill or create a new one.
						</div>
					) : (
						<SkillEditor
							skill={selected}
							draft={draft}
							isNew={isNew}
							canSave={canSave}
							isSavePending={createMutation.isPending || updateMutation.isPending}
							isDeletePending={deleteMutation.isPending}
							onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
							onSave={() =>
								isNew ? createMutation.mutate() : selected && updateMutation.mutate(selected.id)
							}
							onDelete={() => {
								if (selected && confirm(`Delete skill "${selected.name}"?`)) {
									deleteMutation.mutate(selected.id);
								}
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
