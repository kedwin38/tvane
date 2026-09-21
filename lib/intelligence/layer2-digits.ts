// Layer 2 of the Tidevane Intelligence architecture
// (docs/PROJECT_SPECIFICATION.md §2.2): live last-digit distribution
// monitoring for Deriv's Digits contract family (Matches/Differs,
// Even/Odd, Over/Under), motivated directly by the reverse-engineering
// report earlier in this project — digit "0" was found underrepresented
// at 0.97% vs. an expected 10% in that dataset.
//
// Important scope note, carried over from the design discussion: this
// module tests the live empirical digit distribution against the
// THEORETICAL uniform null (p=0.10 per digit) — it does not by itself
// establish tradeable edge. A confirmed deviation from uniform is
// necessary but not sufficient: real edge requires comparing against
// what Deriv actually quotes for a given Digits contract at decision
// time (Layer 3, not yet built), since Deriv may already price off its
// own generator's true statistics rather than a naive uniform
// assumption. This layer's job is the STATE/EVIDENCE-level measurement
// — "is this digit's frequency statistically different from uniform,
// right now" — stated with the same discipline as Layer 1, not a signal
// to trade on directly.
//
// Detection method: Wald's Sequential Probability Ratio Test (SPRT),
// run independently per digit per direction (elevated / depressed).
// SPRT is the right tool for continuous live monitoring specifically
// because — unlike a fixed-window chi-square test — it's valid at any
// stopping time by construction: it doesn't need a pre-committed sample
// size to control false-positive/false-negative rates, which matters
// when ticks arrive continuously and there's no natural "window end."

const P0 = 0.1; // null hypothesis: uniform digit distribution
const P1_HIGH = 0.14; // alternative: this digit elevated to >=14%
const P1_LOW = 0.06; // alternative: this digit depressed to <=6%
const ALPHA = 0.01; // false-positive rate (flag skew that isn't real)
const BETA = 0.05; // false-negative rate (miss skew that is real)

const BOUND_A = Math.log((1 - BETA) / ALPHA); // accept H1 (skew confirmed) above this
const BOUND_B = Math.log(BETA / (1 - ALPHA)); // accept H0 (no skew) below this

const EWMA_LAMBDA = 0.98; // slow decay — digit distribution should be stable if genuinely uniform

export type DigitStatus = "monitoring" | "elevated" | "depressed";

export type DigitState = {
  digit: number;
  empiricalPct: number;
  status: DigitStatus;
  llrHigh: number;
  llrLow: number;
};

export type DigitStatusChange = {
  digit: number;
  status: DigitStatus;
  empiricalPct: number;
  llr: number;
  sampleCount: number;
};

export class DigitTracker {
  private ewmaP = new Array(10).fill(0.1);
  private llrHigh = new Array(10).fill(0);
  private llrLow = new Array(10).fill(0);
  private status: DigitStatus[] = new Array(10).fill("monitoring");
  private n = 0;

  constructor(private symbol: string) {}

  /** Feed one new tick's price. Returns the full live state plus any
   * status transitions that just happened (for DB persistence / alerts). */
  update(price: number): { states: DigitState[]; changes: DigitStatusChange[] } {
    const lastDigit = this.extractLastDigit(price);
    this.n += 1;
    const changes: DigitStatusChange[] = [];

    for (let d = 0; d < 10; d++) {
      const isMatch = d === lastDigit ? 1 : 0;
      this.ewmaP[d] = this.n === 1 ? isMatch : EWMA_LAMBDA * this.ewmaP[d] + (1 - EWMA_LAMBDA) * isMatch;

      this.llrHigh[d] += isMatch
        ? Math.log(P1_HIGH / P0)
        : Math.log((1 - P1_HIGH) / (1 - P0));
      this.llrLow[d] += isMatch
        ? Math.log(P1_LOW / P0)
        : Math.log((1 - P1_LOW) / (1 - P0));

      let newStatus: DigitStatus | null = null;
      if (this.llrHigh[d] >= BOUND_A) {
        newStatus = "elevated";
        this.llrHigh[d] = 0;
        this.llrLow[d] = 0;
      } else if (this.llrLow[d] >= BOUND_A) {
        newStatus = "depressed";
        this.llrHigh[d] = 0;
        this.llrLow[d] = 0;
      } else if (this.llrHigh[d] <= BOUND_B && this.llrLow[d] <= BOUND_B) {
        if (this.status[d] !== "monitoring") newStatus = "monitoring";
        this.llrHigh[d] = 0;
        this.llrLow[d] = 0;
      }

      if (newStatus && newStatus !== this.status[d]) {
        this.status[d] = newStatus;
        changes.push({
          digit: d,
          status: newStatus,
          empiricalPct: this.ewmaP[d] * 100,
          llr: Math.max(this.llrHigh[d], this.llrLow[d]),
          sampleCount: this.n,
        });
      }
    }

    return { states: this.snapshot(), changes };
  }

  private extractLastDigit(price: number): number {
    // Match the reverse-engineering report's own definition: the last
    // decimal digit of the price AT ITS OWN QUOTED PRECISION (pip size
    // varies by symbol — some quote 2 decimals, others 3-4). Forcing a
    // fixed decimal count (toFixed) would zero-pad shorter quotes and
    // silently corrupt the digit, so this uses JS's default
    // stringification, which reproduces the shortest decimal string
    // that round-trips to the same float — in practice, the same
    // decimal places Deriv actually quoted.
    const str = price.toString();
    const lastChar = str[str.length - 1];
    const digit = Number(lastChar);
    return Number.isNaN(digit) ? 0 : digit;
  }

  private snapshot(): DigitState[] {
    return this.ewmaP.map((p, d) => ({
      digit: d,
      empiricalPct: p * 100,
      status: this.status[d],
      llrHigh: this.llrHigh[d],
      llrLow: this.llrLow[d],
    }));
  }

  get sampleCount() {
    return this.n;
  }
}
