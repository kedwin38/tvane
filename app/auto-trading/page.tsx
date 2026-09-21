"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

type Strategy = {
  id: string;
  symbol: string;
  stakeAmount: number;
  maxDailyStakeUsd: number;
  maxTradesPerDay: number;
  enabled: boolean;
  createdAt: string;
};

type LogRow = {
  id: string;
  digit: number;
  contractType: string;
  stakeAmount: number;
  outcome: "executed" | "rejected" | "error";
  reason: string | null;
  contractId: string | null;
  createdAt: string;
};

const OUTCOME_COLOR: Record<LogRow["outcome"], string> = {
  executed: "text-positive",
  rejected: "text-text-3",
  error: "text-negative",
};

export default function AutoTradingPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [symbol, setSymbol] = useState("R_100");
  const [stakeAmount, setStakeAmount] = useState(1);
  const [maxDailyStakeUsd, setMaxDailyStakeUsd] = useState(20);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(20);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);

  async function load() {
    const res = await fetch("/api/auto-strategies");
    if (res.ok) setStrategies((await res.json()).strategies);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  async function createStrategy(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/auto-strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, stakeAmount, maxDailyStakeUsd, maxTradesPerDay }),
    });
    setCreating(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to create strategy.");
      return;
    }
    load();
  }

  async function toggle(strategy: Strategy) {
    await fetch(`/api/auto-strategies/${strategy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !strategy.enabled }),
    });
    load();
  }

  async function remove(strategy: Strategy) {
    await fetch(`/api/auto-strategies/${strategy.id}`, { method: "DELETE" });
    load();
  }

  async function expand(strategy: Strategy) {
    if (expandedId === strategy.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(strategy.id);
    const res = await fetch(`/api/auto-strategies/${strategy.id}/logs`);
    if (res.ok) setLogs((await res.json()).logs);
  }

  return (
    <div className="min-h-screen bg-void">
      <header className="flex items-center justify-between border-b border-hairline px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Mark size={22} />
          <span className="text-sm font-semibold tracking-tight text-text-1">Tidevane</span>
        </Link>
        <Link href="/terminal" className="label-caps text-text-3 hover:text-text-1">
          Terminal
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-1 text-xl font-medium text-text-1">Auto Trading</h1>
        <p className="mb-3 text-xs text-text-3">
          Digit Differs on SPRT-confirmed depressed digits. Risk controls are stake and
          trade-count caps, not a P/L stop — see Trace on each fire.
        </p>
        <p className="mb-8 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          Enabling a strategy executes real trades automatically, with no per-trade
          confirmation. Disable it to stop.
        </p>

        <form
          onSubmit={createStrategy}
          className="mb-10 flex flex-col gap-3 rounded-lg border border-hairline bg-panel p-5"
        >
          <span className="label-caps text-text-3">New strategy</span>
          {error && <p className="text-xs text-negative">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="label-caps text-text-3">Symbol</span>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-sm text-text-1 outline-none focus:border-teal/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label-caps text-text-3">Stake per trade (USD)</span>
              <input
                type="number"
                min={0.35}
                step={0.01}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-sm text-text-1 outline-none focus:border-teal/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label-caps text-text-3">Max daily stake (USD)</span>
              <input
                type="number"
                min={stakeAmount}
                step={0.01}
                value={maxDailyStakeUsd}
                onChange={(e) => setMaxDailyStakeUsd(Number(e.target.value))}
                className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-sm text-text-1 outline-none focus:border-teal/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label-caps text-text-3">Max trades / day</span>
              <input
                type="number"
                min={1}
                value={maxTradesPerDay}
                onChange={(e) => setMaxTradesPerDay(Number(e.target.value))}
                className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-sm text-text-1 outline-none focus:border-teal/50"
              />
            </label>
          </div>
          <button
            disabled={creating}
            className="self-start rounded-md bg-tide-gradient px-4 py-2 text-sm font-medium text-void disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create strategy"}
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {strategies.map((s) => (
            <div key={s.id} className="rounded-lg border border-hairline bg-panel">
              <div className="flex items-center justify-between p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm text-text-1">{s.symbol}</span>
                  <span className="font-mono text-xs text-text-3">
                    ${s.stakeAmount}/trade · ${s.maxDailyStakeUsd}/day cap · {s.maxTradesPerDay}/day max
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => expand(s)} className="label-caps text-text-3 hover:text-text-1">
                    {expandedId === s.id ? "Hide" : "Trace"}
                  </button>
                  <button
                    onClick={() => toggle(s)}
                    className={`label-caps rounded px-3 py-1.5 ${
                      s.enabled ? "bg-positive/10 text-positive" : "bg-panel-raised text-text-2"
                    }`}
                  >
                    {s.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button onClick={() => remove(s)} className="label-caps text-negative hover:underline">
                    Delete
                  </button>
                </div>
              </div>
              {expandedId === s.id && (
                <div className="border-t border-hairline p-4">
                  {logs.length === 0 && <p className="text-xs text-text-3">No fires yet.</p>}
                  <div className="flex flex-col gap-2">
                    {logs.map((l) => (
                      <div key={l.id} className="flex items-baseline justify-between font-mono text-xs">
                        <span className={OUTCOME_COLOR[l.outcome]}>
                          {l.outcome} · digit {l.digit} · ${l.stakeAmount}
                        </span>
                        <span className="text-text-3">{l.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {strategies.length === 0 && (
            <p className="text-xs text-text-3">No strategies yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
