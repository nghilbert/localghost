import { createFileRoute, Link } from "@tanstack/react-router";
import { SignInForm } from "#/features/auth/components/SignInForm";

export const Route = createFileRoute("/_public/sign-in")({ component: SignInCard });

function SignInCard() {
	return (
		<div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
			<div>
				<h2 className="text-lg font-semibold">Welcome back</h2>
				<p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue.</p>
			</div>
			<SignInForm />
			<p className="text-center text-sm text-muted-foreground">
				No account?{" "}
				<Link to="/sign-up" className="font-medium text-foreground underline underline-offset-4">
					Create one
				</Link>
			</p>
		</div>
	);
}
