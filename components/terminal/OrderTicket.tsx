"use client";

import { useEffect, useState } from "react";

type FairValue = {
  fairProbability: number;
  fairValue: number;
  quotedCost: number;
  edge: number;
  edgePct: number;
};

type Quote = {
  id: string;
  ask_price: number;
  payout: number;
  spot: number;
  display_value: string;
  fairValue: FairValue | null;
};

type Family = "updown" | "digits" | "accumulator";

const FAMILIES: { value: Family; label: string }[] = [
  { value: "updown", label: "Rise/Fall" },
  { value: "digits", label: "Digits" },
  { value: "accumulator", label: "Accumulators" },
];

const UPDOWN_TYPES = [
  { value: "CALL", label: "Rise" },
  { value: "PUT", label: "Fall" },
];

// Full Digits family per developers.deriv.com's contract catalogue —
// last-tick-digit contracts. EVEN/ODD take no digit parameter; the rest
// need one (0-9, with OVER/UNDER excluding the degenerate 0/9 case at
// the API level, which Deriv itself validates).
const DIGIT_TYPES = [
  { value: "DIGITMATCH", label: "Matches" },
  { value: "DIGITDIFF", label: "Differs" },
  { value: "DIGITEVEN", label: "Even" },
  { value: "DIGITODD", label: "Odd" },
  { value: "DIGITOVER", label: "Over" },
  { value: "DIGITUNDER", label: "Under" },
];

const GROWTH_RATES = [0.01, 0.02, 0.03, 0.04, 0.05];

export function OrderTicket({
  symbol,
  isVirtual,
}: {
  symbol: string;
  isVirtual: boolean | null;
}) {
  const [family, setFamily] = useState<Family>("updown");
  const [updownType, setUpdownType] = useState("CALL");
  const [digitType, setDigitType] = useState("DIGITDIFF");
  const [amount, setAmount] = useState(10);
  const [duration, setDuration] = useState(5);
  const [durationUnit, setDurationUnit] = useState<"t" | "m">("t");
  const [digitBarrier, setDigitBarrier] = useState(0);
  const [growthRate, setGrowthRate] = useState(0.02);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [orderResult, setOrderResult] = useState<{ ok: boolean; message: string } | null>(null);

  const contractType = family === "updown" ? updownType : family === "digits" ? digitType : "ACCU";
  const digitNeedsBarrier = family === "digits" && digitType !== "DIGITEVEN" && digitType !== "DIGITODD";

  useEffect(() => {
    const params: Record<string, any> = {
      symbol,
      contract_type: contractType,
      amount,
      basis: "stake",
      currency: "USD",
    };
    if (family === "accumulator") {
      params.growth_rate = growthRate;
    } else {
      params.duration = duration;
      params.duration_unit = durationUnit;
      if (digitNeedsBarrier) params.barrier = String(digitBarrier);
    }

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
  }, [symbol, contractType, family, amount, duration, durationUnit, digitBarrier, digitNeedsBarrier, growthRate]);

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

      <div className="grid grid-cols-3 gap-2">
        {FAMILIES.map((f) => (
          <button
            key={f.value}
            onClick={() => setFamily(f.value)}
            className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
              family === f.value
                ? "border-teal/40 bg-teal/10 text-teal"
                : "border-hairline bg-panel-raised text-text-2 hover:text-text-1"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {family === "updown" && (
        <div className="grid grid-cols-2 gap-2">
          {UPDOWN_TYPES.map((c) => (
            <button
              key={c.value}
              onClick={() => setUpdownType(c.value)}
              className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                updownType === c.value
                  ? "border-teal/40 bg-teal/10 text-teal"
                  : "border-hairline bg-panel-raised text-text-2 hover:text-text-1"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {family === "digits" && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {DIGIT_TYPES.map((c) => (
              <button
                key={c.value}
                onClick={() => setDigitType(c.value)}
                className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  digitType === c.value
                    ? "border-teal/40 bg-teal/10 text-teal"
                    : "border-hairline bg-panel-raised text-text-2 hover:text-text-1"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {digitNeedsBarrier && (
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
        </>
      )}

      {family === "accumulator" && (
        <label className="flex flex-col gap-1">
          <span className="label-caps text-text-3">Growth rate</span>
          <select
            value={growthRate}
            onChange={(e) => setGrowthRate(Number(e.target.value))}
            className="rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-text-1 outline-none focus:border-teal/50"
          >
            {GROWTH_RATES.map((r) => (
              <option key={r} value={r}>
                {(r * 100).toFixed(0)}%
              </option>
            ))}
          </select>
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
        {family !== "accumulator" && (
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
        )}
      </div>

      <div className="rounded-md border border-hairline bg-panel-raised p-3">
        {quoteError && <p className="text-xs text-negative">{quoteError}</p>}
        {!quoteError && quote && (
          <div className="flex flex-col gap-2">
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
            {quote.fairValue && (
              <div className="flex items-center justify-between border-t border-hairline pt-2 font-mono text-xs">
                <span className="label-caps text-text-3">Fair value edge</span>
                <span className={quote.fairValue.edgePct >= 0 ? "text-positive" : "text-negative"}>
                  {quote.fairValue.edgePct >= 0 ? "+" : ""}
                  {quote.fairValue.edgePct.toFixed(2)}%
                </span>
              </div>
            )}
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
