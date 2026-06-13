import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { createEvent } from "#/features/calendar/lib/calendar.functions";
import type { createEventInput } from "#/features/calendar/lib/schemas";

export function useCreateEvent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.input<typeof createEventInput>) => createEvent({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
	});
}
