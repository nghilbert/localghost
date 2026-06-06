import { createFileRoute, Link } from "@tanstack/react-router";
import { SignUpForm } from "#/features/auth/components/SignUpForm";

export const Route = createFileRoute("/_public/sign-up")({ component: SignUpCard });

function SignUpCard() {
	return (
		<div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
			<div>
				<h2 className="text-lg font-semibold">Create an account</h2>
				<p className="mt-1 text-sm text-muted-foreground">Enter your details to get started.</p>
			</div>
			<SignUpForm />
			<p className="text-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<Link to="/sign-in" className="font-medium text-foreground underline underline-offset-4">
					Sign in
				</Link>
			</p>
		</div>
	);
}
