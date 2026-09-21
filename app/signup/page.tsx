import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

// Public affiliate/referral link — not a secret, so it's fine as a
// constant here rather than routed through the credentials vault.
// Must be clicked BEFORE Deriv account creation for the referral to
// attach; it is not part of the OAuth login flow itself (see
// docs/PROJECT_SPECIFICATION.md and the note in api/auth/deriv/callback).
const DERIV_SIGNUP_URL = "https://partner-tracking.deriv.com/click?a=89558&o=1&c=3&link_id=1";

export default function SignupPage() {
  return (
    <div className="grid-texture flex min-h-screen items-center justify-center bg-void px-6">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-panel p-8 shadow-instrument">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Mark size={32} />
          <h1 className="text-lg font-medium text-text-1">Create your account</h1>
          <p className="text-sm text-text-2">
            Trading on Tidevane happens through your own Deriv account. Create one on
            Deriv first, then come back and sign in.
          </p>
        </div>

        <a
          href={DERIV_SIGNUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-md bg-tide-gradient px-4 py-3 text-sm font-medium text-void shadow-glow"
        >
          Create a Deriv account
        </a>

        <p className="mt-4 text-center text-xs text-text-3">
          Opens Deriv&apos;s own sign-up in a new tab. Once it&apos;s done, return here.
        </p>

        <div className="mt-6 border-t border-hairline pt-6 text-center">
          <p className="text-xs text-text-3">
            Already have a Deriv account?{" "}
            <Link href="/login" className="text-teal hover:underline">
              Continue with Deriv
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
