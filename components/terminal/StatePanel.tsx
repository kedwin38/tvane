"use client";

import type { Layer1State } from "./Chart";

const PLACEHOLDER_ROWS = [
  {
    key: "EVIDENCE",
    body: "Fair-value pricing engine (Layer 3) is not yet implemented. The order ticket shows Deriv's quoted price only, no modeled edge.",
  },
  {
    key: "CONFIDENCE",
    body: "No confidence interval is computed yet — nothing here should be read as a signal.",
  },
  {
    key: "RISK / INVALIDATION",
    body: "No automated risk engine or kill-switch exists yet. Trades placed here are unmanaged and irreversible.",
  },
  {
    key: "TRACE",
    body: "No backtest or live-validation record exists for this build. Treat every trade as manual and unaided.",
  },
];

export function StatePanel({ state }: { state: Layer1State | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-panel p-4">
      <span className="label-caps text-text-3">Tidevane Intelligence</span>
      <div className="flex flex-col divide-y divide-hairline">
        <div className="flex flex-col gap-1 py-2.5 first:pt-0">
          <span className="label-caps text-teal">STATE</span>
          {state ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-text-2">
              <span>
                σ (annualized) <span className="text-text-1">{state.annualizedSigmaPct.toFixed(2)}%</span>
              </span>
              <span>
                μ (annualized) <span className="text-text-1">{state.annualizedMuPct.toFixed(2)}%</span>
              </span>
              <span>
                samples <span className="text-text-1">{state.samples}</span>
              </span>
              <span>
                granularity <span className="text-text-1">{state.granularity}s</span>
              </span>
            </div>
          ) : (
            <span className="text-xs leading-relaxed text-text-2">Waiting for live data…</span>
          )}
        </div>

        <div className="flex flex-col gap-1 py-2.5">
          <span className="label-caps text-teal">SHIFT</span>
          {state && state.falsification.acf1 !== null ? (
            <div className="flex flex-col gap-1">
              <span
                className={`label-caps w-fit rounded px-1.5 py-0.5 ${
                  state.falsification.modelValid ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning"
                }`}
              >
                {state.falsification.modelValid ? "Model holding" : "Model flagged"}
              </span>
              <span className="font-mono text-xs text-text-3">
                ACF(1)={state.falsification.acf1.toFixed(4)} · Ljung-Box p=
                {state.falsification.ljungBoxP?.toFixed(4)} · excess kurtosis=
                {state.falsification.excessKurtosis?.toFixed(2)}
              </span>
              {state.falsification.invalidReason && (
                <span className="text-xs leading-relaxed text-warning">{state.falsification.invalidReason}</span>
              )}
            </div>
          ) : (
            <span className="text-xs leading-relaxed text-text-2">
              Accumulating samples before the self-falsification battery can run.
            </span>
          )}
        </div>

        {PLACEHOLDER_ROWS.map((row) => (
          <div key={row.key} className="flex flex-col gap-1 py-2.5 last:pb-0">
            <span className="label-caps text-teal">{row.key}</span>
            <span className="text-xs leading-relaxed text-text-2">{row.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
