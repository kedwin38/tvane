import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-void">
      <header className="border-b border-hairline px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Mark size={20} />
          <span className="text-sm font-semibold text-text-1">Tidevane</span>
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-text-2">
        <h1 className="mb-6 text-xl font-medium text-text-1">Privacy Policy</h1>

        <h2 className="mb-2 mt-8 font-medium text-text-1">What we store</h2>
        <p className="mb-4">
          When you sign in with Deriv, we store your Deriv account identifiers
          (login ID, email, country, currency, account type as reported by Deriv), the
          API token Deriv issues for that sign-in, and a record of your sessions. The
          API token is encrypted at rest (AES-256-GCM) and is never sent to your
          browser — it is used only server-side to open your own authorized connection
          to Deriv's API on your behalf.
        </p>

        <h2 className="mb-2 mt-8 font-medium text-text-1">What we don't store</h2>
        <p className="mb-4">
          We do not ask for or store a Deriv password. We do not store payment card
          details — deposits and withdrawals happen entirely on Deriv's own systems.
        </p>

        <h2 className="mb-2 mt-8 font-medium text-text-1">Trading activity</h2>
        <p className="mb-4">
          Trades you place, including those placed by an auto-trading strategy you
          enable, are logged with the reasoning behind each one (see Trace on the
          Auto Trading page) so you can review what happened and why. This log is
          visible to you and to Tidevane's platform administrators for support and
          security purposes.
        </p>

        <h2 className="mb-2 mt-8 font-medium text-text-1">Who can see your data</h2>
        <p className="mb-4">
          Platform administrators can view account metadata and trading activity for
          support, security, and operational purposes. Administrators authenticate
          separately from user accounts and have no access to your Deriv password
          (which we never receive) or your account outside of what your API token
          grants this application.
        </p>

        <h2 className="mb-2 mt-8 font-medium text-text-1">Deleting your data</h2>
        <p className="mb-4">
          Signing out ends your session. To remove your stored account data entirely,
          contact support — this also revokes Tidevane's stored copy of your Deriv API
          token; it does not by itself revoke the token on Deriv's side, which you can
          do from your Deriv account settings.
        </p>

        <p className="mt-10 text-xs text-text-3">
          This page is a plain-language summary, not legal advice, and has not been
          reviewed by a lawyer. It should be replaced with counsel-reviewed terms,
          including applicable data-protection law obligations for your jurisdictions,
          before this platform accepts real users.
        </p>
      </main>
    </div>
  );
}
