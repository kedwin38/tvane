// Shared statistical primitives used across the intelligence layers.

/** Standard normal CDF via the Abramowitz-Stegun erf approximation. */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const poly = t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const p = 1 - d * poly;
  return x >= 0 ? p : 1 - p;
}

export function chiSquarePValueWilsonHilferty(q: number, df: number): number {
  if (q <= 0) return 1;
  const z = (Math.pow(q / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normalCdf(z);
}
