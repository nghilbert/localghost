import { useMutation } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { sendEmail } from "#/features/email/lib/email.functions";
import type { sendEmailInput } from "#/features/email/lib/schemas";

export function useSendEmail() {
	return useMutation({
		mutationFn: (data: z.input<typeof sendEmailInput>) => sendEmail({ data }),
	});
}
