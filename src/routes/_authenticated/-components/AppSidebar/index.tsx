import { RecentChatList } from "#/routes/_authenticated/-components/AppSidebar/RecentChatList";
import { APP_NAME } from "#/shared/lib/constants";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarTrigger,
} from "#/shared/ui/sidebar";
import { AuthMenu } from "./AuthMenu";
import { NotificationCenter } from "./NotificationCenter";
import { PageNav } from "./PageNav";

export function AppSidebar() {
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
				<PageNav />
				<RecentChatList />
			</SidebarContent>

			<SidebarFooter>
				<NotificationCenter />
				<AuthMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
