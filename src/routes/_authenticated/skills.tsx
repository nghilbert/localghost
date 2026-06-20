import { createFileRoute } from "@tanstack/react-router";
import { SkillsManager } from "#/features/skills/components/SkillsManager";

export const Route = createFileRoute("/_authenticated/skills")({
	component: SkillsPage,
});

function SkillsPage() {
	return <SkillsManager />;
}
