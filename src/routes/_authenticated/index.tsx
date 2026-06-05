import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquarePlusIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { createSession } from "#/features/chat/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

function HomePage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const createMut = useMutation({
		mutationFn: () => createSession({ data: { name: "New Chat" } }),
		onSuccess: (session) => {
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
			navigate({ to: "/sessions/$sessionId", params: { sessionId: session.id } });
		},
	});

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4">
			<MessageSquarePlusIcon size={40} className="text-muted-foreground" />
			<div className="text-center">
				<h1 className="text-lg font-semibold">Odysseus</h1>
				<p className="text-sm text-muted-foreground">Your self-hosted AI workspace</p>
			</div>
			<Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
				Start a new chat
			</Button>
		</div>
	);
}
