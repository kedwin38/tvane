"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";

type Health = {
  db: { ok: boolean; latencyMs: number | null; error?: string };
  derivMarket: { ok: boolean; latencyMs: number | null; error?: string };
  activeUserConnections: number;
  userCount: number;
  intelligence: {
    snapshotCount: number;
    lastSnapshotAt: string | null;
    lastSymbol: string | null;
    lastModelValid: boolean | null;
  };
  autoTrading: {
    activeStrategyCount: number;
    last24h: Record<string, number>;
  };
  deployment: { environment: string; serviceName: string; nodeEnv: string };
};

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`h-2 w-2 rounded-full ${ok ? "bg-positive" : "bg-negative"}`} />;
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/health");
    if (!res.ok) {
      setError("Could not load health data.");
      return;
    }
    setHealth(await res.json());
    setError(null);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-void">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-8 text-xl font-medium text-text-1">System Health</h1>

        {error && <p className="text-sm text-negative">{error}</p>}
        {!health && !error && <p className="text-sm text-text-3">Loading…</p>}

        {health && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-hairline bg-panel p-5">
                <div className="flex items-center justify-between">
                  <span className="label-caps text-text-3">Database</span>
                  <StatusDot ok={health.db.ok} />
                </div>
                <p className="mt-2 font-mono text-lg text-text-1">
                  {health.db.ok ? `${health.db.latencyMs}ms` : "down"}
                </p>
                {health.db.error && <p className="mt-1 text-xs text-negative">{health.db.error}</p>}
              </div>

              <div className="rounded-lg border border-hairline bg-panel p-5">
                <div className="flex items-center justify-between">
                  <span className="label-caps text-text-3">Deriv Market Connection</span>
                  <StatusDot ok={health.derivMarket.ok} />
                </div>
                <p className="mt-2 font-mono text-lg text-text-1">
                  {health.derivMarket.ok ? `${health.derivMarket.latencyMs}ms` : "down"}
                </p>
                {health.derivMarket.error && (
                  <p className="mt-1 text-xs text-negative">{health.derivMarket.error}</p>
                )}
              </div>

              <div className="rounded-lg border border-hairline bg-panel p-5">
                <span className="label-caps text-text-3">Active User Connections</span>
                <p className="mt-2 font-mono text-lg text-text-1">{health.activeUserConnections}</p>
              </div>

              <div className="rounded-lg border border-hairline bg-panel p-5">
                <span className="label-caps text-text-3">Registered Users</span>
                <p className="mt-2 font-mono text-lg text-text-1">{health.userCount}</p>
              </div>
            </div>

            <div className="rounded-lg border border-hairline bg-panel p-5">
              <span className="label-caps text-teal">Tidevane Intelligence — Layer 1</span>
              <div className="mt-3 grid grid-cols-3 gap-4 font-mono text-sm">
                <div>
                  <span className="label-caps block text-text-3">Snapshots</span>
                  <span className="text-text-1">{health.intelligence.snapshotCount}</span>
                </div>
                <div>
                  <span className="label-caps block text-text-3">Last symbol</span>
                  <span className="text-text-1">{health.intelligence.lastSymbol ?? "—"}</span>
                </div>
                <div>
                  <span className="label-caps block text-text-3">Model valid</span>
                  <span className={health.intelligence.lastModelValid ? "text-positive" : "text-negative"}>
                    {health.intelligence.lastModelValid === null ? "—" : String(health.intelligence.lastModelValid)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-hairline bg-panel p-5">
              <span className="label-caps text-teal">Auto Trading</span>
              <div className="mt-3 grid grid-cols-4 gap-4 font-mono text-sm">
                <div>
                  <span className="label-caps block text-text-3">Active</span>
                  <span className="text-text-1">{health.autoTrading.activeStrategyCount}</span>
                </div>
                <div>
                  <span className="label-caps block text-text-3">Executed (24h)</span>
                  <span className="text-positive">{health.autoTrading.last24h.executed ?? 0}</span>
                </div>
                <div>
                  <span className="label-caps block text-text-3">Rejected (24h)</span>
                  <span className="text-text-1">{health.autoTrading.last24h.rejected ?? 0}</span>
                </div>
                <div>
                  <span className="label-caps block text-text-3">Errors (24h)</span>
                  <span className="text-negative">{health.autoTrading.last24h.error ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-hairline bg-panel p-5">
              <span className="label-caps text-text-3">Deployment</span>
              <div className="mt-3 grid grid-cols-3 gap-4 font-mono text-sm text-text-1">
                <span>{health.deployment.environment}</span>
                <span>{health.deployment.serviceName}</span>
                <span>{health.deployment.nodeEnv}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
