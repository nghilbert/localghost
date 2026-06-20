import { PlusIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "#/components/ui/item";
import { cn } from "#/lib/utils";
import type { Skill } from "../lib/types";

type SkillListProps = {
	skills: Skill[];
	selectedId: string | null;
	isNew: boolean;
	onSelect: (skill: Skill) => void;
	onNew: () => void;
	className?: string;
};

export function SkillList({
	skills,
	selectedId,
	isNew,
	onSelect,
	onNew,
	className,
}: SkillListProps) {
	return (
		<div className={cn("flex flex-col border-r", className)}>
			<div className="border-b p-3">
				<Button size="sm" className="w-full gap-1.5" onClick={onNew}>
					<PlusIcon size={14} />
					New skill
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto py-1">
				{skills.length === 0 && !isNew && (
					<Empty className="border-0 py-6 px-3">
						<EmptyHeader>
							<EmptyTitle>No skills yet</EmptyTitle>
							<EmptyDescription>Create one to give the agent reusable procedures.</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				<ItemGroup className="gap-0 px-1">
					{skills.map((s) => (
						<Item
							key={s.id}
							size="sm"
							className={cn(
								"cursor-pointer rounded-md",
								selectedId === s.id ? "bg-muted font-medium" : "",
							)}
							onClick={() => onSelect(s)}
						>
							<ItemContent>
								<ItemTitle>{s.name}</ItemTitle>
								{s.description && <ItemDescription>{s.description}</ItemDescription>}
							</ItemContent>
						</Item>
					))}
				</ItemGroup>
			</div>
		</div>
	);
}
