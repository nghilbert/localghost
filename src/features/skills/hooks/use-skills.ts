import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import type { createSkillInput, updateSkillInput } from "#/features/skills/lib/schemas";
import {
	createSkill,
	deleteSkill,
	skillsQueryOptions,
	updateSkill,
} from "#/features/skills/lib/skill.functions";

/**
 * Owns the skills list query plus create/update/delete mutations with cache
 * invalidation and result toasts. The editor keeps its own draft state and
 * passes per-call `onSuccess` callbacks to sync selection after a mutation.
 */
export function useSkills() {
	const queryClient = useQueryClient();
	const { data: skills = [] } = useQuery(skillsQueryOptions());
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["skills"] });

	const createMutation = useMutation({
		mutationFn: (data: z.infer<typeof createSkillInput>) => createSkill({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Skill created");
		},
		onError: () => toast.error("Failed to create skill"),
	});

	const updateMutation = useMutation({
		mutationFn: (data: z.infer<typeof updateSkillInput>) => updateSkill({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Skill saved");
		},
		onError: () => toast.error("Failed to save skill"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteSkill({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Skill deleted");
		},
		onError: () => toast.error("Failed to delete skill"),
	});

	return {
		skills,
		createSkill: createMutation,
		updateSkill: updateMutation,
		deleteSkill: deleteMutation,
	};
}
