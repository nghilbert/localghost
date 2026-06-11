import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { SidebarMenuButton } from "#/components/ui/sidebar";
import { isThemeMode, type ThemeMode, useTheme } from "#/features/theme/ThemeProvider";

const MODE_OPTIONS: { value: ThemeMode; label: string; icon: typeof SunIcon }[] = [
	{ value: "light", label: "Light", icon: SunIcon },
	{ value: "dark", label: "Dark", icon: MoonIcon },
	{ value: "system", label: "System", icon: MonitorIcon },
];

export function ModeToggle() {
	const { mode, setMode } = useTheme();
	const ActiveIcon = MODE_OPTIONS.find((option) => option.value === mode)?.icon ?? MonitorIcon;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton tooltip="Appearance">
					<ActiveIcon size={15} />
					<span>Appearance</span>
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent side="top" align="start">
				<DropdownMenuRadioGroup
					value={mode}
					onValueChange={(value) => {
						if (isThemeMode(value)) setMode(value);
					}}
				>
					{MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
						<DropdownMenuRadioItem key={value} value={value}>
							<Icon size={15} className="mr-1.5" />
							{label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
