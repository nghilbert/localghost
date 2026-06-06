import { Link, useRouterState } from "@tanstack/react-router";
import {
	CalendarIcon,
	FileTextIcon,
	GalleryHorizontalIcon,
	LayoutGridIcon,
	MailIcon,
	SearchIcon,
	SettingsIcon,
	ShieldIcon,
	StickyNoteIcon,
	TimerIcon,
	UsersIcon,
} from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { SessionList } from "#/features/chat/components/SessionList";
import { APP_NAME } from "#/lib/constants";
import { AuthMenu } from "./AuthMenu";

const NAV_ITEMS = [
	{ to: "/notes", label: "Notes", icon: StickyNoteIcon },
	{ to: "/documents", label: "Documents", icon: FileTextIcon },
	{ to: "/research", label: "Research", icon: SearchIcon },
	{ to: "/contacts", label: "Contacts", icon: UsersIcon },
	{ to: "/email", label: "Email", icon: MailIcon },
	{ to: "/calendar", label: "Calendar", icon: CalendarIcon },
	{ to: "/tasks", label: "Tasks", icon: TimerIcon },
	{ to: "/compare", label: "Compare", icon: LayoutGridIcon },
	{ to: "/gallery", label: "Gallery", icon: GalleryHorizontalIcon },
] as const;

export function AppSidebar() {
	const location = useRouterState({ select: (s) => s.location.pathname });

	return (
		<Sidebar variant="floating" collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
						<span className="mr-auto font-semibold truncate group-data-[collapsible=icon]:hidden">
							{APP_NAME}
						</span>
						<SidebarTrigger variant="default" size="icon-lg" />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				{/* Chat sessions */}
				<SessionList />

				{/* Feature nav */}
				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
						Features
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{NAV_ITEMS.map(({ to, label, icon: Icon }) => (
								<SidebarMenuItem key={to}>
									<SidebarMenuButton asChild isActive={location.startsWith(to)} tooltip={label}>
										<Link to={to}>
											<Icon size={15} />
											<span>{label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* System */}
				<SidebarGroup>
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
						System
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={location.startsWith("/settings")}
									tooltip="Settings"
								>
									<Link to="/settings">
										<SettingsIcon size={15} />
										<span>Settings</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={location.startsWith("/admin")} tooltip="Admin">
									<Link to="/admin">
										<ShieldIcon size={15} />
										<span>Admin</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<AuthMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
