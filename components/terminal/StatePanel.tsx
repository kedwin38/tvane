"use client";

const ROWS = [
  {
    key: "STATE",
    body: "Live GBM parameter estimate updates continuously from the current symbol's tick stream (see σ live, top right of the chart).",
  },
  {
    key: "SHIFT",
    body: "Self-falsification battery (ACF, Ljung-Box, kurtosis) is a build-phase item — not yet wired to this terminal.",
  },
  {
    key: "EVIDENCE",
    body: "Fair-value pricing engine (Layer 3) is not yet implemented. The order ticket currently shows Deriv's quoted price only, no modeled edge.",
  },
  {
    key: "CONFIDENCE",
    body: "No confidence interval is computed yet — nothing here should be read as a signal.",
  },
  {
    key: "RISK / INVALIDATION",
    body: "This build has no risk engine or kill-switch. Trades placed here are unmanaged and irreversible.",
  },
  {
    key: "TRACE",
    body: "No backtest or live-validation record exists for this build. Treat every trade as manual and unaided.",
  },
];

export function StatePanel() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-panel p-4">
      <span className="label-caps text-text-3">Tidevane Intelligence</span>
      <div className="flex flex-col divide-y divide-hairline">
        {ROWS.map((row) => (
          <div key={row.key} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
            <span className="label-caps text-teal">{row.key}</span>
            <span className="text-xs leading-relaxed text-text-2">{row.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
