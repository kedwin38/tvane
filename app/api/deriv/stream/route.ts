import { derivClient } from "@/lib/deriv/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

// Rolling realized-volatility estimator (Layer 1 of the intelligence
// architecture in docs/PROJECT_SPECIFICATION.md) — EWMA of squared
// log-returns over closes, annualized. This is the live STATE the
// terminal's info panel shows next to the chart.
function makeVolEstimator(granularitySeconds: number, lambda = 0.94) {
  let lastClose: number | null = null;
  let ewmaVar = 0;
  let n = 0;
  const stepsPerYear = SECONDS_PER_YEAR / granularitySeconds;

  return {
    update(close: number) {
      if (lastClose !== null && close > 0 && lastClose > 0) {
        const r = Math.log(close / lastClose);
        ewmaVar = n === 0 ? r * r : lambda * ewmaVar + (1 - lambda) * r * r;
        n += 1;
      }
      lastClose = close;
      const sigmaPerBar = Math.sqrt(ewmaVar);
      const annualizedSigma = sigmaPerBar * Math.sqrt(stepsPerYear);
      return { sigmaPerBar, annualizedSigmaPct: annualizedSigma * 100, samples: n };
    },
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "R_100";
  const granularity = Number(searchParams.get("granularity") ?? 60);

  const encoder = new TextEncoder();
  const volEstimator = makeVolEstimator(granularity);
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        unsubscribe = await derivClient.subscribe(
          "ticks_history",
          {
            ticks_history: symbol,
            style: "candles",
            granularity,
            count: 300,
            end: "latest",
          },
          (msg) => {
            if (msg.msg_type === "candles" && msg.candles) {
              let state = { sigmaPerBar: 0, annualizedSigmaPct: 0, samples: 0 };
              for (const c of msg.candles) state = volEstimator.update(Number(c.close));
              send("history", { candles: msg.candles, state });
            } else if (msg.msg_type === "ohlc" && msg.ohlc) {
              const state = volEstimator.update(Number(msg.ohlc.close));
              send("candle", { candle: msg.ohlc, state });
            }
          },
          { streamType: "ohlc", discriminator: `${symbol}:${granularity}` }
        );
      } catch (err: any) {
        send("error", { message: err?.message ?? "stream failed" });
        controller.close();
        return;
      }

      req.signal.addEventListener("abort", () => {
        unsubscribe?.();
        controller.close();
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
