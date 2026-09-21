import Image from "next/image";
import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

const CAPABILITIES = [
  { name: "Manual trading", body: "Live pricing across synthetic and real markets." },
  { name: "Auto trading", body: "Strategies governed by measured statistics, not discretion." },
  { name: "Market diagnostics", body: "Continuous statistical monitoring per instrument." },
  { name: "Account security", body: "Encrypted credentials, isolated sessions." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <div className="pointer-events-none absolute inset-0 bg-tide-radial" />
      <div className="grid-texture pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Mark size={24} />
          <span className="text-sm font-semibold tracking-tight">Tidevane</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="label-caps text-text-3 transition-colors hover:text-text-1">
            Log in
          </Link>
          <Link
            href="/terminal"
            className="rounded-md border border-hairline bg-panel px-4 py-2 text-sm text-text-1 transition-colors hover:border-teal/40"
          >
            Open Terminal
          </Link>
        </div>
      </nav>

      <header className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 pb-24 text-center">
        <Image
          src="/brand/tidevane-logo.webp"
          alt="Tidevane"
          width={620}
          height={360}
          priority
          className="mb-8 w-full max-w-xl"
        />
        <div className="mt-4 flex items-center gap-4">
          <Link
            href="/terminal"
            className="rounded-md bg-tide-gradient px-6 py-3 text-sm font-medium text-void shadow-glow"
          >
            Open Terminal
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-hairline px-6 py-3 text-sm text-text-2 transition-colors hover:text-text-1"
          >
            Log in
          </Link>
        </div>
      </header>

      <section className="relative z-10 border-t border-hairline">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4 lg:my-16 lg:mx-6">
          {CAPABILITIES.map((c) => (
            <div key={c.name} className="flex flex-col gap-2 bg-panel p-6">
              <span className="text-sm font-medium text-text-1">{c.name}</span>
              <p className="text-xs leading-relaxed text-text-3">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-10">
          <div className="flex items-center gap-2">
            <Mark size={18} />
            <span className="text-xs text-text-3">Tidevane</span>
          </div>
          <span className="text-xs text-text-3">Trading involves risk.</span>
        </div>
      </footer>
    </div>
  );
}
