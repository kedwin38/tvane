import Image from "next/image";
import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

const PILLARS = [
  {
    n: "01",
    name: "Flow",
    words: "Motion · Continuity · Direction · Velocity · Change",
    body: "Markets are continuous systems. Tidevane reads movement, not isolated snapshots.",
  },
  {
    n: "02",
    name: "Structure",
    words: "Regime · Liquidity · Pressure · Distribution · Context",
    body: "Movement becomes meaningful once the structure underneath it is understood.",
  },
  {
    n: "03",
    name: "Intelligence",
    words: "Inference · Probability · Detection · Adaptation",
    body: "Statistical inference and computational models interpret what the data shows — nothing more.",
  },
  {
    n: "04",
    name: "Traceability",
    words: "Evidence · Provenance · Validation · Auditability",
    body: "Every conclusion the system reaches is inspectable back to the measurement that produced it.",
  },
];

const HIERARCHY = [
  { step: "01", label: "State", q: "What is happening?" },
  { step: "02", label: "Shift", q: "What is changing?" },
  { step: "03", label: "Evidence", q: "Why does the system believe this?" },
  { step: "04", label: "Confidence", q: "How certain is the inference?" },
  { step: "05", label: "Risk", q: "What could invalidate it?" },
  { step: "06", label: "Trace", q: "What actually happened afterward?" },
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
          <a href="#philosophy" className="label-caps text-text-3 transition-colors hover:text-text-1">
            Philosophy
          </a>
          <a href="#hierarchy" className="label-caps text-text-3 transition-colors hover:text-text-1">
            How it reads
          </a>
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

      <header className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 pb-28 text-center">
        <Image
          src="/brand/tidevane-logo.webp"
          alt="Tidevane"
          width={620}
          height={360}
          priority
          className="mb-10 w-full max-w-xl"
        />
        <p className="max-w-xl text-balance text-lg leading-relaxed text-text-2">
          Markets are not static objects to be predicted with certainty. They are continuous
          systems in motion — pressure, liquidity, structure, transition. Tidevane exists to
          turn that movement into measured, evidenced information.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/terminal"
            className="rounded-md bg-tide-gradient px-6 py-3 text-sm font-medium text-void shadow-glow"
          >
            Open Terminal
          </Link>
          <a
            href="#philosophy"
            className="rounded-md border border-hairline px-6 py-3 text-sm text-text-2 transition-colors hover:text-text-1"
          >
            Read the philosophy
          </a>
        </div>
      </header>

      <section id="philosophy" className="relative z-10 border-t border-hairline bg-panel/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <span className="label-caps text-teal">Brand pillars</span>
          <h2 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-text-1">
            Observation over hype. Evidence over authority. Probability over certainty.
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.n} className="flex flex-col gap-3 bg-panel p-6">
                <span className="font-mono text-xs text-text-3">{p.n}</span>
                <span className="text-lg font-medium text-text-1">{p.name}</span>
                <span className="label-caps text-teal/80">{p.words}</span>
                <p className="text-sm leading-relaxed text-text-2">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="hierarchy" className="relative z-10 border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <span className="label-caps text-teal">Information hierarchy</span>
          <h2 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-text-1">
            Every reading is presented in the same disciplined order.
          </h2>
          <div className="mt-14 flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-panel">
            {HIERARCHY.map((h) => (
              <div key={h.step} className="flex items-center gap-6 px-6 py-5">
                <span className="w-8 shrink-0 font-mono text-xs text-text-3">{h.step}</span>
                <span className="w-32 shrink-0 label-caps text-text-1">{h.label}</span>
                <span className="text-sm text-text-2">{h.q}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-10">
          <div className="flex items-center gap-2">
            <Mark size={18} />
            <span className="text-xs text-text-3">Tidevane — Read the flow. Trade the truth.</span>
          </div>
          <span className="text-xs text-text-3">
            Trading involves risk. Nothing shown is a guarantee of outcome.
          </span>
        </div>
      </footer>
    </div>
  );
}
