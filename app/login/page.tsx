import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "That login link expired or was tampered with. Please try again.",
  no_accounts: "Deriv didn't return an account to sign in with.",
  not_configured: "The platform's Deriv connection isn't configured yet.",
  deriv_unreachable: "Couldn't reach Deriv to complete sign-in. Try again shortly.",
  authorize_failed: "Deriv rejected that sign-in attempt.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error ? ERROR_MESSAGES[searchParams.error] ?? "Something went wrong." : null;

  return (
    <div className="grid-texture flex min-h-screen items-center justify-center bg-void px-6">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-panel p-8 shadow-instrument">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Mark size={32} />
          <h1 className="text-lg font-medium text-text-1">Sign in to Tidevane</h1>
          <p className="text-sm text-text-2">
            Tidevane doesn't hold its own password for your trading account — sign in
            directly with Deriv, and only the permissions you grant come back to us.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">
            {error}
          </div>
        )}

        <a
          href="/api/auth/deriv/start"
          className="flex w-full items-center justify-center rounded-md bg-tide-gradient px-4 py-3 text-sm font-medium text-void shadow-glow"
        >
          Continue with Deriv
        </a>

        <p className="mt-6 text-center text-xs text-text-3">
          Don&apos;t have a Deriv account yet?{" "}
          <Link href="/signup" className="text-teal hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
