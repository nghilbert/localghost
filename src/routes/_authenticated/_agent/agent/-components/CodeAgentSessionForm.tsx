import { useQuery } from "@tanstack/react-query";
import { FolderIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { useEndpointModelGroups } from "#/routes/_authenticated/-hooks/use-endpoint-model-groups";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/shared/components/ui/breadcrumb";
import { Empty, EmptyMedia, EmptyTitle } from "#/shared/components/ui/empty";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "#/shared/components/ui/item";
import { Spinner } from "#/shared/components/ui/spinner";
import { codeAgentWorkspaceEntriesQueryOptions } from "#/shared/domain/code-agent/code-agent.functions";
import {
	CODE_AGENT_HARNESSES,
	type CodeAgentHarnessId,
	harnessAcceptsProvider,
} from "#/shared/domain/code-agent/harnesses";
import { createCodeAgentSessionSchema } from "#/shared/domain/code-agent/schemas";
import { useCreateCodeAgentSession } from "#/shared/domain/code-agent/use-sessions";
import { useAppForm } from "#/shared/hooks/use-app-form";

type EndpointModelGroups = ReturnType<typeof useEndpointModelGroups>["groups"];

type CodeAgentSessionFormProps = {
	harnessId: CodeAgentHarnessId;
	onCreated: (sessionId: string) => void;
	className?: string;
};

type SessionFieldsProps = CodeAgentSessionFormProps & { groups: EndpointModelGroups };

/**
 * Starts a code-agent session. The harness decides which endpoints can be offered, by
 * wire protocol, and the chosen endpoint supplies its own live model list.
 */
export function CodeAgentSessionForm({
	harnessId,
	onCreated,
	className,
}: CodeAgentSessionFormProps) {
	const { groups, isLoading } = useEndpointModelGroups(true);

	// `defaultValues` is read once on mount, so the fields wait for the list they
	// preselect from.
	if (isLoading) return <Spinner className="mx-auto text-muted-foreground" />;
	return (
		<SessionFields
			harnessId={harnessId}
			groups={groups}
			onCreated={onCreated}
			className={className}
		/>
	);
}

function SessionFields({ harnessId, groups, onCreated, className }: SessionFieldsProps) {
	const createSession = useCreateCodeAgentSession();
	const harness = CODE_AGENT_HARNESSES.find((entry) => entry.id === harnessId);
	const endpoints = groups.filter((group) =>
		harnessAcceptsProvider({ harness: harnessId, provider: group.endpoint.provider }),
	);

	const form = useAppForm({
		defaultValues: {
			workspacePath: "",
			endpointId: endpoints[0]?.endpoint.id ?? "",
			harness: harnessId,
			model: endpoints[0]?.models[0] ?? "",
			firstMessage: "",
		},
		validators: { onDynamic: createCodeAgentSessionSchema },
		onSubmit: ({ value }) =>
			createSession.mutateAsync(value, { onSuccess: ({ id }) => onCreated(id) }),
	});

	/** Switching endpoint invalidates whichever model was picked from the old one. */
	function onEndpointChange(endpointId: string) {
		const chosen = endpoints.find((group) => group.endpoint.id === endpointId);
		form.setFieldValue("model", chosen?.models[0] ?? "");
	}

	return (
		<form.AppForm>
			<form.SubmitForm formClassName={className}>
				<form.AppField name="workspacePath">
					{(field) => (
						<field.CustomField
							label="Workspace directory"
							description="The agent edits these files in place, so commit or back up first."
							fieldOrientation="vertical"
						>
							<WorkspaceBrowser onChange={field.handleChange} />
						</field.CustomField>
					)}
				</form.AppField>

				<form.AppField
					name="endpointId"
					listeners={{ onChange: ({ value }) => onEndpointChange(value) }}
				>
					{(field) => (
						<field.SelectField
							label="Endpoint"
							description={
								endpoints.length === 0
									? `No saved endpoint speaks ${harness?.label ?? "this harness"}'s protocol. Add one in Settings, or install a model from the Library.`
									: undefined
							}
							placeholder="Choose an endpoint"
							options={endpoints.map((group) => ({
								label: group.endpoint.name,
								value: group.endpoint.id,
							}))}
							fieldOrientation="vertical"
						/>
					)}
				</form.AppField>

				<form.Subscribe selector={(state) => state.values.endpointId}>
					{(endpointId) => (
						<form.AppField name="model">
							{(field) => (
								<field.SelectField
									label="Model"
									description="Served by the endpoint above."
									placeholder={endpointId ? "Choose a model" : "Choose an endpoint first"}
									options={(
										endpoints.find((group) => group.endpoint.id === endpointId)?.models ?? []
									).map((model) => ({ label: model, value: model }))}
									fieldOrientation="vertical"
								/>
							)}
						</form.AppField>
					)}
				</form.Subscribe>

				<form.AppField name="firstMessage">
					{(field) => (
						<field.TextareaField
							label="Task"
							description="What the agent should do first. The session stays open, so you can follow up."
							placeholder="List the files in this repo and summarize what it does."
							fieldOrientation="vertical"
						/>
					)}
				</form.AppField>

				<form.SubmitButton data-testid="code-agent-session-submit">Start session</form.SubmitButton>
			</form.SubmitForm>
		</form.AppForm>
	);
}

/** Click-to-navigate folder browser standing in for a typed path: a few composed primitives, no path ever typed. */
function WorkspaceBrowser({ onChange }: { onChange: (workspacePath: string) => void }) {
	const [subpath, setSubpath] = useState("");
	const { data } = useQuery(codeAgentWorkspaceEntriesQueryOptions(subpath));
	const segments = subpath.split("/").filter(Boolean);

	function selectFolder(nextSubpath: string) {
		if (!data) return;
		setSubpath(nextSubpath);
		/** Absolute path a browser click resolves to, given the workspace root and a subpath. */
		onChange(nextSubpath ? `${data.root}/${nextSubpath}` : data.root);
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg border p-2.5">
			<Breadcrumb>
				<BreadcrumbList className="flex-nowrap overflow-x-auto text-nowrap">
					<BreadcrumbItem>
						{segments.length === 0 ? (
							<BreadcrumbPage>Home</BreadcrumbPage>
						) : (
							<BreadcrumbLink onClick={() => selectFolder("")}>Home</BreadcrumbLink>
						)}
					</BreadcrumbItem>
					{segments.map((segment, index) => {
						const crumbSubpath = segments.slice(0, index + 1).join("/");
						return (
							<Fragment key={crumbSubpath}>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									{index === segments.length - 1 ? (
										<BreadcrumbPage>{segment}</BreadcrumbPage>
									) : (
										<BreadcrumbLink onClick={() => selectFolder(crumbSubpath)}>
											{segment}
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>
							</Fragment>
						);
					})}
				</BreadcrumbList>
			</Breadcrumb>

			<div className="max-h-40 overflow-y-auto">
				{data?.entries.length ? (
					<ItemGroup className="gap-0.5">
						{data.entries.map((entry) => (
							<Item
								key={entry}
								size="sm"
								render={<button type="button" />}
								onClick={() => selectFolder(subpath ? `${subpath}/${entry}` : entry)}
							>
								<ItemMedia variant="icon">
									<FolderIcon />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>{entry}</ItemTitle>
								</ItemContent>
							</Item>
						))}
					</ItemGroup>
				) : (
					<Empty>
						<EmptyMedia variant="icon">
							<FolderIcon />
						</EmptyMedia>
						<EmptyTitle>No folders</EmptyTitle>
					</Empty>
				)}
			</div>
		</div>
	);
}
