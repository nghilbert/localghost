import { Sidebar } from "#/components/ui/sidebar";
import { AuthMenu } from "#/features/account/components/AuthMenu";
import { RecentChatList } from "#/features/chat/components/RecentChatList";
import { NotificationCenter } from "#/features/library/components/NotificationCenter";
import { APP_NAME } from "#/lib/constants";
import { PageNav } from "./PageNav";

/** The app's sidebar: navigation, chats, downloads, and the user menu. */
export function AppSidebar() {
	return (
		<Sidebar.Root variant="floating" collapsible="icon">
			<Sidebar.Header>
				<Sidebar.Menu>
					<Sidebar.MenuItem className="flex items-center in-sidebar-icon:justify-center in-sidebar-icon:px-0">
						<span className="mr-auto truncate font-semibold in-sidebar-icon:hidden">
							{APP_NAME}
						</span>
						<Sidebar.Trigger color="primary" variant="solid" size="lg" />
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.Header>

			<Sidebar.Content>
				<PageNav />
				<RecentChatList />
			</Sidebar.Content>

			<Sidebar.Footer>
				<NotificationCenter />
				<AuthMenu />
			</Sidebar.Footer>
		</Sidebar.Root>
	);
}
