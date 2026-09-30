import { Toast as BaseToast } from "@base-ui/react/toast";
import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
	XIcon,
} from "lucide-react";
import { Button } from "./button";

/**
 * The app-wide toast manager. Works anywhere, including outside React, such as
 * in a mutation's `onError`:
 *
 * ```ts
 * toast.add({ title: "Saved", type: "success" });
 * ```
 */
export const toast = BaseToast.createToastManager();

const icons = {
	success: CircleCheckIcon,
	info: InfoIcon,
	warning: TriangleAlertIcon,
	error: OctagonXIcon,
	loading: Loader2Icon,
} as const;

function isIconType(type: string | undefined): type is keyof typeof icons {
	return type !== undefined && Object.hasOwn(icons, type);
}

function ToastList() {
	const { toasts } = BaseToast.useToastManager();

	return toasts.map((item) => {
		const Icon = isIconType(item.type) ? icons[item.type] : undefined;
		return (
			<BaseToast.Root
				key={item.id}
				toast={item}
				className="pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-2xl border bg-surface text-surface-fg shadow-lg outline-none select-none [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms] [--gap:0.75rem] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] h-(--height) transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full focus-visible:ring-3 focus-visible:ring-ring/50 data-expanded:h-(--toast-height) data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))] data-limited:opacity-0 data-starting-style:transform-[translateY(150%)] data-ending-style:opacity-0 [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)]"
			>
				<BaseToast.Content className="flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 data-behind:opacity-0 data-expanded:opacity-100">
					{Icon && (
						<Icon
							aria-hidden
							className={
								item.type === "loading"
									? "animate-spin"
									: item.type === "error"
										? "text-danger"
										: undefined
							}
						/>
					)}
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<BaseToast.Title className="text-sm font-medium" />
						<BaseToast.Description className="text-sm text-muted-fg" />
					</div>
					<BaseToast.Action render={<Button variant="outlined" size="sm" />} />
					<BaseToast.Close
						aria-label="Close"
						render={<Button variant="quiet" size="sm" iconOnly />}
					>
						<XIcon />
					</BaseToast.Close>
				</BaseToast.Content>
			</BaseToast.Root>
		);
	});
}

/** Renders the toasts. Mount it once, in the root layout. */
export function Toaster(props: Omit<BaseToast.Provider.Props, "toastManager">) {
	return (
		<BaseToast.Provider toastManager={toast} {...props}>
			{props.children}
			<BaseToast.Portal>
				<BaseToast.Viewport className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full">
					<ToastList />
				</BaseToast.Viewport>
			</BaseToast.Portal>
		</BaseToast.Provider>
	);
}
