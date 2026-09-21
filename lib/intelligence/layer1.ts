// Layer 1 of the Tidevane Intelligence architecture
// (docs/PROJECT_SPECIFICATION.md §2.2): a live rolling GBM parameter
// estimator plus a self-falsification battery that continuously checks
// whether the "memoryless diffusion" assumption still holds for a given
// symbol. STATE and SHIFT in the brand's information hierarchy are the
// direct output of this module — nothing here is a trading signal, it is
// a measurement of the present state of the process.
//
// The statistical basis is the reverse-engineering analysis performed
// earlier in this project on Deriv synthetic-index data: near-zero
// ACF(1), near-zero volatility clustering (Ljung-Box on squared
// returns), and near-Gaussian kurtosis are the signature of a pure GBM
// martingale. This module re-runs those same tests continuously, live,
// per symbol, and flags the model invalid the moment a symbol stops
// behaving that way — see docs/PROJECT_SPECIFICATION.md's note that
// Deriv can retune a generator, or that a symbol may simply not match
// the offline file's findings.

import { chiSquarePValueWilsonHilferty } from "./stats";

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const MAX_BUFFER = 400;
const BATTERY_EVERY_N_UPDATES = 20;
const LJUNG_BOX_LAGS = 10;

export type SelfFalsificationResult = {
  modelValid: boolean;
  invalidReason: string | null;
  acf1: number | null;
  acf1CriticalBand: number | null;
  ljungBoxStat: number | null;
  ljungBoxP: number | null;
  excessKurtosis: number | null;
};

export type Layer1State = {
  symbol: string;
  granularity: number;
  muPerBar: number;
  sigmaPerBar: number;
  annualizedSigmaPct: number;
  annualizedMuPct: number;
  samples: number;
  falsification: SelfFalsificationResult;
};

function runSelfFalsification(returns: number[]): SelfFalsificationResult {
  const n = returns.length;
  if (n < 60) {
    return {
      modelValid: true,
      invalidReason: null,
      acf1: null,
      acf1CriticalBand: null,
      ljungBoxStat: null,
      ljungBoxP: null,
      excessKurtosis: null,
    };
  }

  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const centered = returns.map((r) => r - mean);
  const variance = centered.reduce((a, b) => a + b * b, 0) / n;

  // ACF(1) on raw returns — should be ~0 for a memoryless process.
  let acfNumerator = 0;
  for (let t = 1; t < n; t++) acfNumerator += centered[t] * centered[t - 1];
  const acf1 = variance > 0 ? acfNumerator / (n * variance) : 0;
  const acf1CriticalBand = 1.96 / Math.sqrt(n);

  // Ljung-Box on squared returns — onset of volatility clustering.
  const sq = returns.map((r) => r * r);
  const sqMean = sq.reduce((a, b) => a + b, 0) / n;
  const sqCentered = sq.map((s) => s - sqMean);
  const sqVar = sqCentered.reduce((a, b) => a + b * b, 0) / n;
  let ljungBoxStat = 0;
  for (let lag = 1; lag <= Math.min(LJUNG_BOX_LAGS, n - 2); lag++) {
    let num = 0;
    for (let t = lag; t < n; t++) num += sqCentered[t] * sqCentered[t - lag];
    const rk = sqVar > 0 ? num / (n * sqVar) : 0;
    ljungBoxStat += (rk * rk) / (n - lag);
  }
  ljungBoxStat *= n * (n + 2);
  const ljungBoxP = chiSquarePValueWilsonHilferty(ljungBoxStat, LJUNG_BOX_LAGS);

  // Excess kurtosis — onset of jump risk / fat tails.
  const m2 = variance;
  const m4 = centered.reduce((a, b) => a + b ** 4, 0) / n;
  const excessKurtosis = m2 > 0 ? m4 / (m2 * m2) - 3 : 0;

  const reasons: string[] = [];
  if (Math.abs(acf1) > acf1CriticalBand * 1.5) {
    reasons.push(`ACF(1)=${acf1.toFixed(4)} exceeds the 95% band (±${acf1CriticalBand.toFixed(4)}) — returns may no longer be memoryless.`);
  }
  if (ljungBoxP < 0.01) {
    reasons.push(`Ljung-Box p=${ljungBoxP.toFixed(4)} on squared returns — volatility clustering may be emerging.`);
  }
  if (excessKurtosis > 2) {
    reasons.push(`Excess kurtosis=${excessKurtosis.toFixed(2)} — fat tails/jump risk emerging beyond the pure-diffusion baseline.`);
  }

  return {
    modelValid: reasons.length === 0,
    invalidReason: reasons.length ? reasons.join(" ") : null,
    acf1,
    acf1CriticalBand,
    ljungBoxStat,
    ljungBoxP,
    excessKurtosis,
  };
}

export class RollingEstimator {
  private lastClose: number | null = null;
  private ewmaVar = 0;
  private ewmaMean = 0;
  private n = 0;
  private updatesSinceBattery = 0;
  private ranBatteryThisUpdate = false;
  private returnBuffer: number[] = [];
  private lastFalsification: SelfFalsificationResult = {
    modelValid: true,
    invalidReason: null,
    acf1: null,
    acf1CriticalBand: null,
    ljungBoxStat: null,
    ljungBoxP: null,
    excessKurtosis: null,
  };
  private readonly stepsPerYear: number;
  private readonly lambda: number;

  constructor(
    private symbol: string,
    private granularitySeconds: number,
    lambda = 0.94
  ) {
    this.stepsPerYear = SECONDS_PER_YEAR / granularitySeconds;
    this.lambda = lambda;
  }

  update(close: number): Layer1State {
    this.ranBatteryThisUpdate = false;
    if (this.lastClose !== null && close > 0 && this.lastClose > 0) {
      const r = Math.log(close / this.lastClose);
      this.ewmaVar = this.n === 0 ? r * r : this.lambda * this.ewmaVar + (1 - this.lambda) * r * r;
      this.ewmaMean = this.n === 0 ? r : this.lambda * this.ewmaMean + (1 - this.lambda) * r;
      this.n += 1;

      this.returnBuffer.push(r);
      if (this.returnBuffer.length > MAX_BUFFER) this.returnBuffer.shift();

      this.updatesSinceBattery += 1;
      if (this.updatesSinceBattery >= BATTERY_EVERY_N_UPDATES) {
        this.updatesSinceBattery = 0;
        this.lastFalsification = runSelfFalsification(this.returnBuffer);
        this.ranBatteryThisUpdate = true;
      }
    }
    this.lastClose = close;

    const sigmaPerBar = Math.sqrt(this.ewmaVar);
    const annualizedSigmaPct = sigmaPerBar * Math.sqrt(this.stepsPerYear) * 100;
    const annualizedMuPct = this.ewmaMean * this.stepsPerYear * 100;

    return {
      symbol: this.symbol,
      granularity: this.granularitySeconds,
      muPerBar: this.ewmaMean,
      sigmaPerBar,
      annualizedSigmaPct,
      annualizedMuPct,
      samples: this.n,
      falsification: this.lastFalsification,
    };
  }

  shouldPersistSnapshot(): boolean {
    return this.ranBatteryThisUpdate;
  }
}
