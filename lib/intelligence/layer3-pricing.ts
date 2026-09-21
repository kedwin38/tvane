import { normalCdf } from "./stats";

// Layer 3 of the Tidevane Intelligence architecture
// (docs/PROJECT_SPECIFICATION.md §2.2): closed-form fair-value pricing
// under GBM, using the live σ estimate from Layer 1.
//
// CRITICAL DESIGN CONSTRAINT, not an oversight: every function here
// prices under drift = 0, never the live-estimated μ from Layer 1.
// This project's whole premise (the reverse-engineering report, the
// Layer 1 self-falsification battery) is that these instruments are
// memoryless martingales — there is no forecastable direction, only
// possible mispricing of a contract against its own fair value. Pricing
// with an estimated, noisy μ would silently convert this module from
// "detect mispricing" into "predict direction," which is exactly the
// mistake the rest of this project argues is impossible here. If a
// symbol's live μ becomes large enough to matter, that is Layer 1's
// self-falsification battery's job to flag (the martingale assumption
// itself would be breaking down) — not something Layer 3 should react
// to by trading a forecast.
//
// T (time to expiry) must be in YEARS. Contract durations quoted in
// ticks (duration_unit "t") do not map to a fixed calendar duration —
// Deriv's tick arrival rate is not exactly uniform (confirmed in this
// project's own reverse-engineering report) — so this module is only
// valid for calendar-duration contracts (seconds/minutes/hours/days),
// never tick-count durations. Callers must not approximate one.

export type FairValueResult = {
  fairProbability: number;
  fairValue: number;
  quotedCost: number;
  edge: number;
  edgePct: number;
};

function toFairValue(fairProbability: number, payout: number, quotedCost: number): FairValueResult {
  const fairValue = fairProbability * payout;
  const edge = fairValue - quotedCost;
  return {
    fairProbability,
    fairValue,
    quotedCost,
    edge,
    edgePct: quotedCost > 0 ? (edge / quotedCost) * 100 : 0,
  };
}

/** Rise/Fall, Higher/Lower — probability spot finishes above (CALL) or
 * below (PUT) a barrier at expiry, under zero-drift GBM. */
export function digitalFairValue(params: {
  spot: number;
  barrier: number;
  sigmaAnnual: number; // as a decimal, e.g. 0.75 for 75%
  years: number;
  direction: "above" | "below";
  payout: number;
  quotedCost: number;
}): FairValueResult {
  const { spot, barrier, sigmaAnnual, years, direction, payout, quotedCost } = params;
  const sqrtT = Math.sqrt(years);
  const d2 = (Math.log(spot / barrier) - (sigmaAnnual * sigmaAnnual * years) / 2) / (sigmaAnnual * sqrtT);
  const probAbove = normalCdf(d2);
  const fairProbability = direction === "above" ? probAbove : 1 - probAbove;
  return toFairValue(fairProbability, payout, quotedCost);
}

/** Touch/No Touch — probability spot touches a barrier at any point
 * before expiry, under zero-drift GBM, via the reflection principle for
 * the running maximum/minimum of Brownian motion. */
export function touchFairValue(params: {
  spot: number;
  barrier: number;
  sigmaAnnual: number;
  years: number;
  mode: "touch" | "no-touch";
  payout: number;
  quotedCost: number;
}): FairValueResult {
  const { spot, barrier, sigmaAnnual, years, mode, payout, quotedCost } = params;
  const sqrtT = Math.sqrt(years);
  // b = log-distance to barrier; sign determines up vs down barrier.
  const b = Math.log(barrier / spot);
  const absB = Math.abs(b);
  // Zero drift (m = -sigma^2/2 is the log-price drift under GBM with
  // zero arithmetic drift) — see the module-level note on why this is
  // deliberately not the live-estimated mu.
  const m = -(sigmaAnnual * sigmaAnnual) / 2;
  const signedM = b >= 0 ? m : -m;

  const term1 = normalCdf((-absB + signedM * years) / (sigmaAnnual * sqrtT));
  const term2 = Math.exp((2 * signedM * absB) / (sigmaAnnual * sigmaAnnual)) *
    normalCdf((-absB - signedM * years) / (sigmaAnnual * sqrtT));
  const probTouch = term1 + term2;

  const fairProbability = mode === "touch" ? probTouch : 1 - probTouch;
  return toFairValue(fairProbability, payout, quotedCost);
}

/** Vanilla call/put — standard Black-Scholes value with r=0, q=0 (see
 * module-level note: this project's synthetic indices need no discount
 * rate since there is no external market to arbitrage against). */
export function vanillaFairValue(params: {
  spot: number;
  strike: number;
  sigmaAnnual: number;
  years: number;
  type: "call" | "put";
  quotedCost: number;
  multiplier?: number;
}): { fairPrice: number; quotedCost: number; edge: number; edgePct: number } {
  const { spot, strike, sigmaAnnual, years, type, quotedCost, multiplier = 1 } = params;
  const sqrtT = Math.sqrt(years);
  const d1 = (Math.log(spot / strike) + (sigmaAnnual * sigmaAnnual * years) / 2) / (sigmaAnnual * sqrtT);
  const d2 = d1 - sigmaAnnual * sqrtT;

  const fairPrice =
    type === "call"
      ? (spot * normalCdf(d1) - strike * normalCdf(d2)) * multiplier
      : (strike * normalCdf(-d2) - spot * normalCdf(-d1)) * multiplier;

  const edge = fairPrice - quotedCost;
  return { fairPrice, quotedCost, edge, edgePct: quotedCost > 0 ? (edge / quotedCost) * 100 : 0 };
}
