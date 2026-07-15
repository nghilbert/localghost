import type { ReactNode } from "react";
import { render as baseRender, type ComponentRenderOptions } from "vitest-browser-react";
import { TooltipProvider } from "#/shared/components/ui/tooltip";

function Providers({ children }: { children: ReactNode }) {
	return <TooltipProvider>{children}</TooltipProvider>;
}

/** Browser-mode render wrapped in the app-wide providers (currently `TooltipProvider`). */
export function render(ui: ReactNode, options?: Omit<ComponentRenderOptions, "wrapper">) {
	return baseRender(ui, { wrapper: Providers, ...options });
}

export { renderHook } from "vitest-browser-react";
