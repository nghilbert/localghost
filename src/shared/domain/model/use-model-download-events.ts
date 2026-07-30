import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { libraryStatusQueryOptions } from "#/shared/domain/model/model.functions";
import { aggregatePullProgress } from "#/shared/domain/model/pull-progress";
import { llamaModelDownloadEventSchema } from "#/shared/domain/model/schemas";
import type { RuntimeStatus } from "#/shared/domain/model/types";

/** Keeps the shared runtime-status cache synchronized with llama.cpp's model event stream. */
export function useModelDownloadEvents(endpointId: string | null): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!endpointId) return;
		const queryKey = libraryStatusQueryOptions().queryKey;
		const search = new URLSearchParams({ endpointId });
		const source = new EventSource(`/api/models/events?${search}`);

		source.onopen = () => {
			void queryClient.invalidateQueries({ queryKey });
		};
		source.onmessage = (message) => {
			let value: unknown;
			try {
				value = JSON.parse(message.data);
			} catch {
				return;
			}
			const parsed = llamaModelDownloadEventSchema.safeParse(value);
			if (!parsed.success) return;
			const event = parsed.data;
			if (event.event === "download_progress") {
				queryClient.setQueryData<RuntimeStatus>(queryKey, (status) => {
					if (!status?.found) return status;
					return {
						...status,
						downloads: {
							...status.downloads,
							[event.model]: aggregatePullProgress(event.data.progress),
						},
					};
				});
				return;
			}
			void queryClient.invalidateQueries({ queryKey });
		};

		return () => source.close();
	}, [endpointId, queryClient]);
}
