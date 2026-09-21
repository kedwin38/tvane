"use client";

import { useEffect, useState } from "react";

type Symbol = {
  symbol: string;
  display_name: string;
  market_display_name: string;
};

export function SymbolPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (symbol: string) => void;
}) {
  const [symbols, setSymbols] = useState<Symbol[]>([]);

  useEffect(() => {
    fetch("/api/deriv/symbols")
      .then((r) => r.json())
      .then((data) => setSymbols(data.symbols ?? []))
      .catch(() => setSymbols([]));
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-sm text-text-1 outline-none focus:border-teal/50"
    >
      {symbols.length === 0 && <option value={value}>{value}</option>}
      {symbols.map((s) => (
        <option key={s.symbol} value={s.symbol}>
          {s.display_name} — {s.market_display_name}
        </option>
      ))}
    </select>
  );
}
