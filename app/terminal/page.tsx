"use client";

import { useState } from "react";
import Link from "next/link";
import { Mark } from "@/components/brand/Mark";
import { AccountBadge } from "@/components/terminal/AccountBadge";
import { SymbolPicker } from "@/components/terminal/SymbolPicker";
import { Chart } from "@/components/terminal/Chart";
import { OrderTicket } from "@/components/terminal/OrderTicket";
import { StatePanel } from "@/components/terminal/StatePanel";

export default function TerminalPage() {
  const [symbol, setSymbol] = useState("R_100");
  const [isVirtual, setIsVirtual] = useState<boolean | null>(null);

  return (
    <div className="flex h-screen flex-col bg-void">
      <header className="flex items-center justify-between border-b border-hairline px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Mark size={22} />
          <span className="text-sm font-semibold tracking-tight text-text-1">Tidevane</span>
        </Link>
        <div className="flex items-center gap-6">
          <SymbolPicker value={symbol} onChange={setSymbol} />
          <AccountBadge onLoaded={(acc) => setIsVirtual(acc ? acc.is_virtual : null)} />
        </div>
      </header>

      <main className="grid flex-1 grid-cols-[1fr_340px] gap-4 overflow-hidden p-4">
        <Chart symbol={symbol} />
        <div className="flex flex-col gap-4 overflow-y-auto">
          <OrderTicket symbol={symbol} isVirtual={isVirtual} />
          <StatePanel />
        </div>
      </main>
    </div>
  );
}
