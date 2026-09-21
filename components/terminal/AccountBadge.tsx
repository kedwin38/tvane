"use client";

import { useEffect, useState } from "react";

type Account = {
  loginid: string;
  currency: string;
  is_virtual: boolean;
  balance: { balance: number; currency: string };
  error?: string;
};

export function AccountBadge({ onLoaded }: { onLoaded?: (acc: Account | null) => void }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deriv/account")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          onLoaded?.(null);
        } else {
          setAccount(data);
          onLoaded?.(data);
        }
      })
      .catch(() => setError("Could not reach Tidevane backend."));
  }, [onLoaded]);

  if (error) {
    return <span className="label-caps text-negative">{error}</span>;
  }

  if (!account) {
    return <span className="label-caps text-text-3">Connecting…</span>;
  }

  return (
    <div className="flex items-center gap-3 font-mono text-sm">
      <span
        className={`label-caps rounded px-2 py-0.5 ${
          account.is_virtual ? "bg-panel-raised text-text-2" : "bg-negative/15 text-negative"
        }`}
      >
        {account.is_virtual ? "Demo" : "Real"}
      </span>
      <span className="text-text-2">{account.loginid}</span>
      <span className="tabular text-text-1">
        {account.balance.balance.toFixed(2)} {account.balance.currency}
      </span>
    </div>
  );
}
