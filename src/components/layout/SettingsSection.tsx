import type { PropsWithChildren, ReactNode } from "react";
import { Card } from "#/components/ui/card";

type SettingsSectionProps = PropsWithChildren<{
	id?: string;
	/** The heading; a status badge can sit beside the text. */
	title: ReactNode;
	description?: ReactNode;
}>;

/** One titled card on a settings page. Every settings tab is a stack of these. */
export function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
	return (
		<Card.Root id={id}>
			<Card.Header>
				<Card.Title className="flex items-center gap-2">{title}</Card.Title>
				{description && <Card.Description>{description}</Card.Description>}
			</Card.Header>
			<Card.Content className="flex flex-col gap-4">{children}</Card.Content>
		</Card.Root>
	);
}
