"use client";

import type { Layer1State } from "./Chart";

const PLACEHOLDER_ROWS = [
  { key: "EVIDENCE", body: "Not built — no modeled fair value yet." },
  { key: "CONFIDENCE", body: "Not built." },
  { key: "RISK", body: "No automated risk controls. Trades are manual and final." },
  { key: "TRACE", body: "No backtest record yet." },
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
                σ (ann.) <span className="text-text-1">{state.annualizedSigmaPct.toFixed(2)}%</span>
              </span>
              <span>
                μ (ann.) <span className="text-text-1">{state.annualizedMuPct.toFixed(2)}%</span>
              </span>
              <span>
                samples <span className="text-text-1">{state.samples}</span>
              </span>
              <span>
                interval <span className="text-text-1">{state.granularity}s</span>
              </span>
            </div>
          ) : (
            <span className="text-xs text-text-3">Waiting for data…</span>
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
                ACF(1)={state.falsification.acf1.toFixed(4)} · LB p=
                {state.falsification.ljungBoxP?.toFixed(4)} · kurt=
                {state.falsification.excessKurtosis?.toFixed(2)}
              </span>
              {state.falsification.invalidReason && (
                <span className="text-xs text-warning">{state.falsification.invalidReason}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-text-3">Accumulating samples.</span>
          )}
        </div>

        {PLACEHOLDER_ROWS.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between py-2.5 last:pb-0">
            <span className="label-caps text-teal">{row.key}</span>
            <span className="text-xs text-text-3">{row.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
