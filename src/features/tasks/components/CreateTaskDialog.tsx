import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { CreateTaskForm } from "#/features/tasks/components/CreateTaskForm";

export function CreateTaskDialog() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-1">
					<PlusIcon size={13} />
					New Task
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Scheduled Task</DialogTitle>
					<DialogDescription>
						Schedule an LLM prompt to run automatically on a recurring basis.
					</DialogDescription>
				</DialogHeader>
				<CreateTaskForm onSuccess={() => setIsOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}
