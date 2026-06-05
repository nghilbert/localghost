import { Link } from "@tanstack/react-router";
import {
	CalendarIcon,
	CopyrightIcon,
	FileTextIcon,
	GalleryHorizontalIcon,
	LayoutGridIcon,
	MailIcon,
	SearchIcon,
	SettingsIcon,
	ShieldIcon,
	TimerIcon,
} from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { SessionList } from "#/features/chat/components/SessionList";
import { APP_NAME, COPYRIGHT_STATEMENT } from "#/lib/constants";
import { AuthMenu } from "./AuthMenu";

export function AppSidebar() {
	return (
		<Sidebar variant="floating" collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
						<span className="mr-auto font-semibold truncate">{APP_NAME}</span>
						<SidebarTrigger variant="default" size="icon-lg" />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				{/* New chat + session list */}
				<SessionList />

				{/* Feature nav */}
				<SidebarGroup className="group-data-[collapsible=icon]:hidden">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/documents">
										<FileTextIcon size={14} />
										Documents
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/research">
										<SearchIcon size={14} />
										Research
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/email">
										<MailIcon size={14} />
										Email
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/calendar">
										<CalendarIcon size={14} />
										Calendar
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/tasks">
										<TimerIcon size={14} />
										Tasks
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/compare">
										<LayoutGridIcon size={14} />
										Compare
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/gallery">
										<GalleryHorizontalIcon size={14} />
										Gallery
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Settings / Admin */}
				<SidebarGroup className="group-data-[collapsible=icon]:hidden">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/settings">
										<SettingsIcon size={14} />
										Settings
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link to="/admin">
										<ShieldIcon size={14} />
										Admin
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
					<footer className="text-center truncate">
						<small className="inline-flex items-center gap-1 text-muted-foreground">
							<CopyrightIcon size="1em" />
							{COPYRIGHT_STATEMENT}
						</small>
					</footer>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<AuthMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
