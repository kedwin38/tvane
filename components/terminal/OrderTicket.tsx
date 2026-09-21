"use client";

import { useEffect, useState } from "react";

type Quote = {
  id: string;
  ask_price: number;
  payout: number;
  spot: number;
  display_value: string;
};

const CONTRACT_TYPES = [
  { value: "CALL", label: "Rise" },
  { value: "PUT", label: "Fall" },
  { value: "DIGITDIFF", label: "Digit Differs" },
  { value: "DIGITOVER", label: "Digit Over" },
];

export function OrderTicket({
  symbol,
  isVirtual,
}: {
  symbol: string;
  isVirtual: boolean | null;
}) {
  const [contractType, setContractType] = useState("CALL");
  const [amount, setAmount] = useState(10);
  const [duration, setDuration] = useState(5);
  const [durationUnit, setDurationUnit] = useState<"t" | "m">("t");
  const [digitBarrier, setDigitBarrier] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [orderResult, setOrderResult] = useState<{ ok: boolean; message: string } | null>(null);
  const isDigit = contractType.startsWith("DIGIT");

  useEffect(() => {
    const params: Record<string, any> = {
      symbol,
      contract_type: contractType,
      amount,
      basis: "stake",
      currency: "USD",
      duration,
      duration_unit: durationUnit,
    };
    if (isDigit) params.barrier = String(digitBarrier);

    setQuote(null);
    setQuoteError(null);
    const es = new EventSource(`/api/deriv/proposal?params=${encodeURIComponent(JSON.stringify(params))}`);
    es.addEventListener("quote", (evt) => setQuote(JSON.parse((evt as MessageEvent).data)));
    es.addEventListener("error", (evt: any) => {
      try {
        const data = JSON.parse(evt.data);
        setQuoteError(data.message);
      } catch {
        setQuoteError("Quote stream disconnected.");
      }
    });
    return () => es.close();
  }, [symbol, contractType, amount, duration, durationUnit, digitBarrier, isDigit]);

  async function placeTrade() {
    if (!quote) return;
    setOrderResult(null);
    const res = await fetch("/api/deriv/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposal_id: quote.id,
        price: quote.ask_price,
        confirm: true,
      }),
    });
    const data = await res.json();
    setConfirming(false);
    setConfirmText("");
    if (!res.ok) {
      setOrderResult({ ok: false, message: data.error ?? "Order failed." });
    } else {
      setOrderResult({
        ok: true,
        message: `Bought contract #${data.buy.contract_id} at ${data.buy.buy_price}.`,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="label-caps text-text-3">Order Ticket</span>
        {isVirtual !== null && (
          <span
            className={`label-caps rounded px-2 py-0.5 ${
              isVirtual ? "bg-panel-raised text-text-2" : "bg-negative/15 text-negative"
            }`}
          >
            {isVirtual ? "Demo Account" : "Real Money"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CONTRACT_TYPES.map((c) => (
          <button
            key={c.value}
            onClick={() => setContractType(c.value)}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
              contractType === c.value
                ? "border-teal/40 bg-teal/10 text-teal"
                : "border-hairline bg-panel-raised text-text-2 hover:text-text-1"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isDigit && (
        <label className="flex flex-col gap-1">
          <span className="label-caps text-text-3">Digit</span>
          <input
            type="number"
            min={0}
            max={9}
            value={digitBarrier}
            onChange={(e) => setDigitBarrier(Number(e.target.value))}
            className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-text-1 outline-none focus:border-teal/50"
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label-caps text-text-3">Stake (USD)</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-text-1 outline-none focus:border-teal/50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-caps text-text-3">Duration</span>
          <div className="flex gap-1">
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-text-1 outline-none focus:border-teal/50"
            />
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as "t" | "m")}
              className="rounded-md border border-hairline bg-panel-raised px-2 font-mono text-text-1 outline-none focus:border-teal/50"
            >
              <option value="t">ticks</option>
              <option value="m">min</option>
            </select>
          </div>
        </label>
      </div>

      <div className="rounded-md border border-hairline bg-panel-raised p-3">
        {quoteError && <p className="text-xs text-negative">{quoteError}</p>}
        {!quoteError && quote && (
          <div className="flex items-center justify-between font-mono text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="label-caps text-text-3">Payout</span>
              <span className="text-text-1">{quote.payout.toFixed(2)} USD</span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className="label-caps text-text-3">Cost</span>
              <span className="text-text-1">{quote.ask_price.toFixed(2)} USD</span>
            </div>
          </div>
        )}
        {!quoteError && !quote && (
          <p className="text-xs text-text-3">Fetching live quote…</p>
        )}
      </div>

      {!confirming ? (
        <button
          disabled={!quote || !!quoteError}
          onClick={() => setConfirming(true)}
          className="rounded-md bg-tide-gradient px-4 py-2.5 text-sm font-medium text-void disabled:cursor-not-allowed disabled:opacity-40"
        >
          Place Trade
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/5 p-3">
          <p className="text-xs text-text-2">
            This executes a real order against{" "}
            <span className="text-text-1">{isVirtual ? "your demo account" : "REAL MONEY"}</span>.
            Type <span className="font-mono text-text-1">CONFIRM</span> to proceed.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-text-1 outline-none focus:border-teal/50"
            placeholder="CONFIRM"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
              }}
              className="flex-1 rounded-md border border-hairline px-3 py-2 text-sm text-text-2"
            >
              Cancel
            </button>
            <button
              disabled={confirmText !== "CONFIRM"}
              onClick={placeTrade}
              className="flex-1 rounded-md bg-negative/90 px-3 py-2 text-sm font-medium text-void disabled:cursor-not-allowed disabled:opacity-40"
            >
              Execute
            </button>
          </div>
        </div>
      )}

      {orderResult && (
        <p className={`text-xs ${orderResult.ok ? "text-positive" : "text-negative"}`}>
          {orderResult.message}
        </p>
      )}
    </div>
  );
}
