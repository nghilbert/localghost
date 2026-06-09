import { Trash2Icon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import type { Skill, SkillDraft } from "../lib/types";

type SkillEditorProps = {
	skill: Skill | null;
	draft: SkillDraft;
	isNew: boolean;
	canSave: boolean;
	isSavePending: boolean;
	isDeletePending: boolean;
	onChange: (patch: Partial<SkillDraft>) => void;
	onSave: () => void;
	onDelete: () => void;
};

export function SkillEditor({
	skill,
	draft,
	isNew,
	canSave,
	isSavePending,
	isDeletePending,
	onChange,
	onSave,
	onDelete,
}: SkillEditorProps) {
	return (
		<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="skill-name">Name</Label>
					<Input
						id="skill-name"
						value={draft.name}
						onChange={(e) => onChange({ name: e.target.value })}
						placeholder="e.g. Summarize Text"
						maxLength={100}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="skill-desc">Description</Label>
					<Input
						id="skill-desc"
						value={draft.description}
						onChange={(e) => onChange({ description: e.target.value })}
						placeholder="When this skill is useful"
						maxLength={500}
					/>
				</div>
			</div>

			<div className="flex flex-1 flex-col space-y-1.5">
				<Label htmlFor="skill-content">Content</Label>
				<Textarea
					id="skill-content"
					value={draft.content}
					onChange={(e) => onChange({ content: e.target.value })}
					placeholder="Describe the procedure, steps, or instructions for this skill…"
					className="min-h-[300px] flex-1 resize-none"
				/>
			</div>

			<div className="flex items-center justify-between">
				{skill && !isNew ? (
					<Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeletePending}>
						<Trash2Icon size={14} className="mr-1.5" />
						Delete
					</Button>
				) : (
					<div />
				)}
				<Button size="sm" disabled={!canSave || isSavePending} onClick={onSave}>
					{isNew ? "Create skill" : "Save changes"}
				</Button>
			</div>
		</div>
	);
}
