import { useState } from "react";
import {
	ModelPicker,
	type ModelPickerSlotProps,
} from "#/features/chat/components/ChatInput/ModelPicker";
import { useEndpointModelGroups } from "#/features/library/hooks/use-endpoint-model-groups";

/** The chat's model picker, listing every endpoint's models with the Library's live runtime. */
export function ChatModelPicker(props: ModelPickerSlotProps) {
	const [open, setOpen] = useState(false);
	const { groups, isLoading, isError } = useEndpointModelGroups(open);
	return (
		<ModelPicker
			{...props}
			open={open}
			onOpenChange={setOpen}
			groups={groups}
			isLoading={isLoading}
			isError={isError}
		/>
	);
}
