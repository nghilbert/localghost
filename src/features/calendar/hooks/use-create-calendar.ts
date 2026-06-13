import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { createCalendar } from "#/features/calendar/lib/calendar.functions";
import type { createCalendarInput } from "#/features/calendar/lib/schemas";

export function useCreateCalendar() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.input<typeof createCalendarInput>) => createCalendar({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendars"] }),
	});
}
