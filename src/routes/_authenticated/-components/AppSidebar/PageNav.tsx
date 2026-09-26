import { Link, type LinkProps, useRouterState } from "@tanstack/react-router";
import { LibraryIcon, type LucideIcon, MessageCirclePlusIcon } from "lucide-react";
import { Sidebar } from "#/components/ui/sidebar";

type NavItem = {
	label: string;
	to: LinkProps["to"];
	NavIcon: LucideIcon;
	/** Path prefixes that count as this section, beyond `to` itself. */
	matches: readonly string[];
};
const NAV_ITEMS = [
	{ label: "Chat", to: "/new", NavIcon: MessageCirclePlusIcon, matches: ["/new", "/chat"] },
	{ label: "Library", to: "/library", NavIcon: LibraryIcon, matches: ["/library"] },
] as const satisfies NavItem[];

/** Links to the app's main pages. */
export function PageNav() {
	const location = useRouterState({ select: (s) => s.location.pathname });

	return (
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{NAV_ITEMS.map(({ to, label, NavIcon, matches }) => (
						<Sidebar.MenuItem key={to}>
							<Sidebar.MenuButton
								render={<Link to={to} />}
								active={matches.some((prefix) => location.startsWith(prefix))}
								tooltip={label}
							>
								<NavIcon />
								<span>{label}</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					))}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	);
}
