import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SignInForm } from "#/routes/_public/-components/SignInForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { signUpAvailabilityQueryOptions } from "#/shared/domain/auth/auth.functions";

export const Route = createFileRoute("/_public/sign-in")({
	loader: ({ context }) =>
		context.queryClient.query({ ...signUpAvailabilityQueryOptions(), staleTime: "static" }),
	component: SignInPage,
});

function SignInPage() {
	const { data: signUp } = useSuspenseQuery(signUpAvailabilityQueryOptions());

	return (
		<Card>
			<CardHeader>
				<CardTitle>Welcome back</CardTitle>
				<CardDescription>Sign in to your account to continue.</CardDescription>
			</CardHeader>
			<CardContent>
				<SignInForm />
			</CardContent>
			{signUp.open && (
				<CardFooter className="justify-center gap-1 text-muted-foreground">
					No account?
					<Link to="/sign-up" className="font-medium text-foreground underline underline-offset-4">
						Create one
					</Link>
				</CardFooter>
			)}
		</Card>
	);
}
