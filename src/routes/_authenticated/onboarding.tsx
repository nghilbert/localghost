import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "#/features/onboarding/components/OnboardingPage";

export const Route = createFileRoute("/_authenticated/onboarding")({
	component: OnboardingPage,
});
