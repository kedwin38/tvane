import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-void">
      <header className="border-b border-hairline px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Mark size={20} />
          <span className="text-sm font-semibold text-text-1">Tidevane</span>
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-text-2">
        <h1 className="mb-6 text-xl font-medium text-text-1">Terms of Use</h1>

        <h2 className="mb-2 mt-8 font-medium text-text-1">What Tidevane is</h2>
        <p className="mb-4">
          Tidevane is a third-party interface and market-analysis layer built on
          Deriv's public API. It is not a broker, does not hold client funds, and is
          not a party to any trade you place — trades are executed directly between
          you and Deriv. Using Tidevane requires a Deriv account in good standing and
          is subject to Deriv's own terms of use in addition to these.
        </p>

        <h2 className="mb-2 mt-8 font-medium text-text-1">Your responsibility</h2>
        <p className="mb-4">
          You are solely responsible for every trade placed through your account,
          whether placed manually or by an automated strategy you have enabled. You
          confirm you understand the Risk Disclosure before trading, and that no
          content on this platform — including computed statistics, fair-value
          estimates, or model outputs — is investment advice or a recommendation to
          trade.
        </p>

        <h2 className="mb-2 mt-8 font-medium text-text-1">Account access</h2>
        <p className="mb-4">
          You authenticate via Deriv's own OAuth login; Tidevane never receives or
          stores your Deriv password. You are responsible for keeping your own device
          and session secure. Tidevane may suspend access to an account it reasonably
          believes is compromised or being used in violation of these terms.
        </p>

        <h2 className="mb-2 mt-8 font-medium text-text-1">No warranty</h2>
        <p className="mb-4">
          Tidevane is provided "as is." Statistical models, live estimates, and
          automated strategies may contain errors, may stop functioning correctly, or
          may be temporarily or permanently disabled without notice. Tidevane does not
          warrant uninterrupted access, the accuracy of any computed figure, or any
          particular trading outcome.
        </p>

        <h2 className="mb-2 mt-8 font-medium text-text-1">Changes</h2>
        <p className="mb-4">
          These terms may change as the platform develops. Continued use after a
          change constitutes acceptance of the updated terms.
        </p>

        <p className="mt-10 text-xs text-text-3">
          This page is a plain-language summary, not legal advice, and has not been
          reviewed by a lawyer. It should be replaced with counsel-reviewed terms
          before this platform accepts real users, and should be checked against
          Deriv's Business Partners terms given Tidevane's relationship to Deriv's API.
        </p>
      </main>
    </div>
  );
}
