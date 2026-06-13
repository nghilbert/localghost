import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { createContact } from "#/features/contacts/lib/contact.functions";
import type { createContactInput } from "#/features/contacts/lib/schemas";

export function useCreateContact() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.infer<typeof createContactInput>) => createContact({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
	});
}
