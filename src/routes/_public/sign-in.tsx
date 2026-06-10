import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { SignInForm } from "#/features/auth/components/SignInForm";

export const Route = createFileRoute("/_public/sign-in")({ component: SignInCard });

function SignInCard() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Welcome back</CardTitle>
				<CardDescription>Sign in to your account to continue.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<SignInForm />
				<p className="text-center text-sm text-muted-foreground">
					No account?{" "}
					<Link to="/sign-up" className="font-medium text-foreground underline underline-offset-4">
						Create one
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
