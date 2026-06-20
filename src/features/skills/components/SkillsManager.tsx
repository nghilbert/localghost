import { useState } from "react";
import { SkillEditor } from "#/features/skills/components/SkillEditor";
import { SkillList } from "#/features/skills/components/SkillList";
import { useSkills } from "#/features/skills/hooks/use-skills";
import { BLANK_SKILL, type Skill, type SkillDraft } from "#/features/skills/lib/types";

export function SkillsManager() {
	const { skills, createSkill, updateSkill, deleteSkill } = useSkills();

	const [selected, setSelected] = useState<Skill | null>(null);
	const [draft, setDraft] = useState<SkillDraft>(BLANK_SKILL);
	const [isNew, setIsNew] = useState(false);

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

	function handleSave() {
		const trimmed = {
			name: draft.name.trim(),
			description: draft.description.trim(),
			content: draft.content.trim(),
		};
		if (isNew) {
			createSkill.mutate(
				{ ...trimmed, description: trimmed.description || undefined },
				{
					onSuccess: (skill) => {
						setIsNew(false);
						setSelected(skill);
						setDraft({ name: skill.name, description: skill.description, content: skill.content });
					},
				},
			);
			return;
		}
		if (!selected) return;
		updateSkill.mutate(
			{ id: selected.id, ...trimmed },
			{ onSuccess: (skill) => setSelected(skill) },
		);
	}

	function handleDelete() {
		if (selected && confirm(`Delete skill "${selected.name}"?`)) {
			deleteSkill.mutate(selected.id, {
				onSuccess: () => {
					setSelected(null);
					setIsNew(false);
				},
			});
		}
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
			<div className="flex min-h-0 flex-1">
				<SkillList
					skills={skills}
					selectedId={selected?.id ?? null}
					isNew={isNew}
					onSelect={handleSelectSkill}
					onNew={handleNew}
					className="w-64 shrink-0"
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
							isSavePending={createSkill.isPending || updateSkill.isPending}
							isDeletePending={deleteSkill.isPending}
							onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
							onSave={handleSave}
							onDelete={handleDelete}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
