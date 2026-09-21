"use client";

import { useEffect, useMemo, useState } from "react";

type DigitStatus = "monitoring" | "elevated" | "depressed";
type DigitState = {
  digit: number;
  empiricalPct: number;
  status: DigitStatus;
  llrHigh: number;
  llrLow: number;
};

const WIDTH = 296;
const HEIGHT = 160;
const PAD_LEFT = 28;
const PAD_BOTTOM = 20;
const PAD_TOP = 10;
const BAR_GAP = 2;
const EXPECTED_PCT = 10;

export function DigitPanel({ symbol }: { symbol: string }) {
  const [states, setStates] = useState<DigitState[] | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/deriv/digits?symbol=${symbol}`);
    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("error", () => setConnected(false));
    es.addEventListener("digits", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setStates(data.states);
      setSampleCount(data.sampleCount);
    });
    return () => es.close();
  }, [symbol]);

  const maxPct = useMemo(() => {
    if (!states) return 20;
    const observedMax = Math.max(...states.map((s) => s.empiricalPct), EXPECTED_PCT);
    return Math.max(20, Math.ceil((observedMax * 1.15) / 5) * 5);
  }, [states]);

  const plotWidth = WIDTH - PAD_LEFT - 8;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const barSlot = plotWidth / 10;
  const barWidth = Math.min(24, barSlot - BAR_GAP);

  const yFor = (pct: number) => PAD_TOP + plotHeight * (1 - pct / maxPct);
  const expectedY = yFor(EXPECTED_PCT);

  const flaggedCount = states?.filter((s) => s.status !== "monitoring").length ?? 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="label-caps text-text-3">Digit Distribution — live</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "live-dot bg-teal" : "bg-text-3"}`} />
          <span className="label-caps text-text-3">{sampleCount.toLocaleString()} ticks</span>
        </div>
      </div>

      {!states ? (
        <p className="text-xs text-text-3">Waiting for live ticks…</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full overflow-visible">
            {[0, 5, 10, 15, 20].filter((v) => v <= maxPct).map((v) => (
              <g key={v}>
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - 8}
                  y1={yFor(v)}
                  y2={yFor(v)}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
                <text x={PAD_LEFT - 6} y={yFor(v) + 3} textAnchor="end" className="fill-text-3" fontSize={9}>
                  {v}%
                </text>
              </g>
            ))}

            <line
              x1={PAD_LEFT}
              x2={WIDTH - 8}
              y1={expectedY}
              y2={expectedY}
              stroke="#566574"
              strokeWidth={1}
            />
            <text x={WIDTH - 8} y={expectedY - 4} textAnchor="end" className="fill-text-3" fontSize={9}>
              expected 10%
            </text>

            {states.map((s, i) => {
              const x = PAD_LEFT + i * barSlot + (barSlot - barWidth) / 2;
              const y = yFor(s.empiricalPct);
              const h = PAD_TOP + plotHeight - y;
              const flagged = s.status !== "monitoring";
              const fill = flagged ? "#E0A93C" : "#2FE0CB";
              const isHovered = hovered === s.digit;

              return (
                <g
                  key={s.digit}
                  onMouseEnter={() => setHovered(s.digit)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "default" }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(h, 1)}
                    rx={4}
                    fill={fill}
                    opacity={isHovered ? 1 : 0.9}
                  />
                  {flagged && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize={9}
                      className="fill-warning"
                    >
                      {s.status === "elevated" ? "▲" : "▼"}
                    </text>
                  )}
                  <text
                    x={x + barWidth / 2}
                    y={PAD_TOP + plotHeight + 13}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-text-3"
                  >
                    {s.digit}
                  </text>
                  {isHovered && (
                    <g>
                      <rect
                        x={Math.min(Math.max(x - 20, 2), WIDTH - 96)}
                        y={Math.max(y - 34, 2)}
                        width={92}
                        height={26}
                        rx={4}
                        fill="#111822"
                        stroke="rgba(255,255,255,0.08)"
                      />
                      <text
                        x={Math.min(Math.max(x - 20, 2), WIDTH - 96) + 46}
                        y={Math.max(y - 34, 2) + 11}
                        textAnchor="middle"
                        fontSize={9}
                        className="fill-text-1"
                      >
                        digit {s.digit}: {s.empiricalPct.toFixed(2)}%
                      </text>
                      <text
                        x={Math.min(Math.max(x - 20, 2), WIDTH - 96) + 46}
                        y={Math.max(y - 34, 2) + 21}
                        textAnchor="middle"
                        fontSize={8}
                        className="fill-text-3"
                      >
                        {s.status}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          <p className="text-xs leading-relaxed text-text-2">
            {flaggedCount === 0
              ? "All digits within expected range of uniform (10%)."
              : `${flaggedCount} digit${flaggedCount > 1 ? "s" : ""} statistically deviating from uniform (SPRT, α=0.01/β=0.05).`}{" "}
            Deviation from uniform is not by itself tradeable edge — see the note in
            lib/intelligence/layer2-digits.ts.
          </p>
        </>
      )}
    </div>
  );
}
