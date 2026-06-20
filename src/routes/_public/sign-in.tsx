import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { SignInForm } from "#/features/auth/components/SignInForm";

export const Route = createFileRoute("/_public/sign-in")({ component: SignInPage });

function SignInPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Welcome back</CardTitle>
				<CardDescription>Sign in to your account to continue.</CardDescription>
			</CardHeader>
			<CardContent>
				<SignInForm />
			</CardContent>
			<CardFooter className="justify-center gap-1 text-muted-foreground">
				No account?
				<Link to="/sign-up" className="font-medium text-foreground underline underline-offset-4">
					Create one
				</Link>
			</CardFooter>
		</Card>
	);
}
