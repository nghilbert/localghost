import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { SignUpForm } from "#/routes/_public/-components/SignUpForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { signUpAvailabilityQueryOptions } from "#/shared/domain/auth/auth.functions";

export const Route = createFileRoute("/_public/sign-up")({
	// The account already exists, so this page has nothing to offer; better-auth
	// would refuse the submit anyway, only after the form had been filled in.
	beforeLoad: async ({ context }) => {
		const { open } = await context.queryClient.query({
			...signUpAvailabilityQueryOptions(),
			staleTime: "static",
		});
		if (!open) throw redirect({ to: "/sign-in" });
	},
	component: SignUpPage,
});

function SignUpPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Create an account</CardTitle>
				<CardDescription>Enter your details to get started.</CardDescription>
			</CardHeader>
			<CardContent>
				<SignUpForm />
			</CardContent>
			<CardFooter className="justify-center gap-1 text-muted-foreground">
				Already have an account?
				<Link to="/sign-in" className="font-medium text-foreground underline underline-offset-4">
					Sign in
				</Link>
			</CardFooter>
		</Card>
	);
}
