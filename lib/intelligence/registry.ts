import "server-only";
import { getMarketSocket } from "@/lib/deriv/market";
import { RollingEstimator, type Layer1State } from "./layer1";
import { DigitTracker, type DigitState } from "./layer2-digits";
import { prisma } from "@/lib/db/prisma";

// Single server-side source of truth per symbol for Layer 1/2 state.
// Previously each SSE connection created its own RollingEstimator /
// DigitTracker, which meant the live σ estimate reset to cold-start on
// every browser reconnect and was invisible to anything other than the
// exact connection that created it. That's fine for a demo chart but
// wrong for anything meant to price contracts off a live estimate — a
// pricing engine needs one continuously-running estimator per symbol,
// independent of how many (if any) browser tabs are currently watching.
//
// This registry owns exactly one Deriv subscription per symbol
// (candles for Layer 1, ticks for Layer 2), keeps it running once
// started regardless of listener count, and fans out updates to any
// number of SSE listeners.

type CandleEntry = {
  estimator: RollingEstimator;
  latest: Layer1State | null;
  history: any[] | null;
  lastCandle: any | null;
  listeners: Set<(state: Layer1State, candle: any) => void>;
};

type TickEntry = {
  tracker: DigitTracker;
  latest: { states: DigitState[]; sampleCount: number } | null;
  listeners: Set<(states: DigitState[], sampleCount: number, epoch: number) => void>;
  changeListeners: Set<(changes: import("./layer2-digits").DigitStatusChange[]) => void>;
};

const globalForRegistry = globalThis as unknown as {
  __candleRegistry?: Map<string, CandleEntry>;
  __tickRegistry?: Map<string, TickEntry>;
};

const candleRegistry = globalForRegistry.__candleRegistry ?? new Map<string, CandleEntry>();
globalForRegistry.__candleRegistry = candleRegistry;

const tickRegistry = globalForRegistry.__tickRegistry ?? new Map<string, TickEntry>();
globalForRegistry.__tickRegistry = tickRegistry;

function candleKey(symbol: string, granularity: number) {
  return `${symbol}:${granularity}`;
}

async function ensureCandleStream(symbol: string, granularity: number): Promise<CandleEntry> {
  const key = candleKey(symbol, granularity);
  const existing = candleRegistry.get(key);
  if (existing) return existing;

  const entry: CandleEntry = {
    estimator: new RollingEstimator(symbol, granularity),
    latest: null,
    history: null,
    lastCandle: null,
    listeners: new Set(),
  };
  candleRegistry.set(key, entry);

  const MAX_HISTORY = 300;
  const socket = await getMarketSocket();
  await socket.subscribe(
    "ticks_history",
    { ticks_history: symbol, style: "candles", granularity, count: MAX_HISTORY, end: "latest" },
    (msg) => {
      if (msg.msg_type === "candles" && msg.candles?.length) {
        let state = entry.estimator.update(Number(msg.candles[0].close));
        for (const c of msg.candles.slice(1)) state = entry.estimator.update(Number(c.close));
        entry.latest = state;
        entry.history = msg.candles;
        entry.lastCandle = msg.candles[msg.candles.length - 1];
        for (const l of entry.listeners) l(state, { candles: msg.candles });
      } else if (msg.msg_type === "ohlc" && msg.ohlc) {
        const state = entry.estimator.update(Number(msg.ohlc.close));
        entry.latest = state;
        entry.lastCandle = msg.ohlc;
        if (entry.history) {
          const last = entry.history[entry.history.length - 1];
          if (last && last.epoch === msg.ohlc.open_time) {
            entry.history[entry.history.length - 1] = msg.ohlc;
          } else {
            entry.history.push(msg.ohlc);
            if (entry.history.length > MAX_HISTORY) entry.history.shift();
          }
        }
        for (const l of entry.listeners) l(state, msg.ohlc);
        if (entry.estimator.shouldPersistSnapshot()) {
          prisma.intelligenceSnapshot
            .create({
              data: {
                symbol: state.symbol,
                granularity: state.granularity,
                muPerBar: state.muPerBar,
                sigmaPerBar: state.sigmaPerBar,
                annualizedSigmaPct: state.annualizedSigmaPct,
                sampleCount: state.samples,
                modelValid: state.falsification.modelValid,
                invalidReason: state.falsification.invalidReason,
                acf1: state.falsification.acf1,
                ljungBoxStat: state.falsification.ljungBoxStat,
                ljungBoxP: state.falsification.ljungBoxP,
                excessKurtosis: state.falsification.excessKurtosis,
              },
            })
            .catch(() => {});
        }
      }
    },
    { streamType: "ohlc", discriminator: key }
  );

  return entry;
}

async function ensureTickStream(symbol: string): Promise<TickEntry> {
  const existing = tickRegistry.get(symbol);
  if (existing) return existing;

  const entry: TickEntry = {
    tracker: new DigitTracker(symbol),
    latest: null,
    listeners: new Set(),
    changeListeners: new Set(),
  };
  tickRegistry.set(symbol, entry);

  const socket = await getMarketSocket();
  await socket.subscribe(
    "ticks",
    { ticks: symbol },
    (msg) => {
      if (msg.msg_type !== "tick" || !msg.tick) return;
      const { states, changes } = entry.tracker.update(Number(msg.tick.quote));
      entry.latest = { states, sampleCount: entry.tracker.sampleCount };
      for (const l of entry.listeners) l(states, entry.tracker.sampleCount, msg.tick.epoch);
      if (changes.length) {
        prisma.digitSignal
          .createMany({
            data: changes.map((c) => ({
              symbol,
              digit: c.digit,
              status: c.status,
              empiricalPct: c.empiricalPct,
              llr: c.llr,
              sampleCount: c.sampleCount,
            })),
          })
          .catch(() => {});
        for (const l of entry.changeListeners) l(changes);
      }
    },
    { streamType: "tick", discriminator: symbol }
  );

  return entry;
}

export async function subscribeCandles(
  symbol: string,
  granularity: number,
  onUpdate: (state: Layer1State, candle: any) => void
): Promise<() => void> {
  const entry = await ensureCandleStream(symbol, granularity);
  entry.listeners.add(onUpdate);
  if (entry.latest && entry.history) onUpdate(entry.latest, { candles: entry.history });
  return () => entry.listeners.delete(onUpdate);
}

export async function subscribeTicks(
  symbol: string,
  onUpdate: (states: DigitState[], sampleCount: number, epoch: number) => void
): Promise<() => void> {
  const entry = await ensureTickStream(symbol);
  entry.listeners.add(onUpdate);
  if (entry.latest) onUpdate(entry.latest.states, entry.latest.sampleCount, Date.now() / 1000);
  return () => entry.listeners.delete(onUpdate);
}

/** Fires only when a digit's SPRT status actually transitions (not on
 * every tick) — this is what lib/autotrading/engine.ts reacts to. */
export async function subscribeDigitChanges(
  symbol: string,
  onChange: (changes: import("./layer2-digits").DigitStatusChange[]) => void
): Promise<() => void> {
  const entry = await ensureTickStream(symbol);
  entry.changeListeners.add(onChange);
  return () => entry.changeListeners.delete(onChange);
}

/** Current live Layer 1 state + spot price for a symbol, starting the
 * underlying stream if it isn't already running. Used by the pricing
 * engine, which needs a live σ estimate and current spot whether or not
 * anyone has the chart open. */
export async function getLiveState(
  symbol: string,
  granularity = 60
): Promise<{ state: Layer1State; spot: number } | null> {
  const entry = await ensureCandleStream(symbol, granularity);
  if (!entry.latest || !entry.lastCandle) return null;
  return { state: entry.latest, spot: Number(entry.lastCandle.close) };
}
