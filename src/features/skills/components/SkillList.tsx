import { PlusIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import type { Skill } from "../lib/types";

type SkillListProps = {
	skills: Skill[];
	selectedId: string | null;
	isNew: boolean;
	onSelect: (skill: Skill) => void;
	onNew: () => void;
};

export function SkillList({ skills, selectedId, isNew, onSelect, onNew }: SkillListProps) {
	return (
		<div className="flex w-64 shrink-0 flex-col border-r">
			<div className="border-b p-3">
				<Button size="sm" className="w-full gap-1.5" onClick={onNew}>
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
						onClick={() => onSelect(s)}
						className={cn(
							"flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
							selectedId === s.id && "bg-muted font-medium",
						)}
					>
						<span className="truncate">{s.name}</span>
						{s.description && (
							<span className="truncate text-[11px] text-muted-foreground">{s.description}</span>
						)}
					</button>
				))}
			</div>
		</div>
	);
}
