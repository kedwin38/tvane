import { getMarketSocket } from "@/lib/deriv/market";
import { RollingEstimator } from "@/lib/intelligence/layer1";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "R_100";
  const granularity = Number(searchParams.get("granularity") ?? 60);

  const encoder = new TextEncoder();
  const estimator = new RollingEstimator(symbol, granularity);
  let unsubscribe: (() => void) | null = null;

  const persistSnapshot = (state: ReturnType<RollingEstimator["update"]>) => {
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
      .catch(() => {
        /* best-effort persistence; the live stream must not depend on the DB */
      });
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const socket = await getMarketSocket();
        unsubscribe = await socket.subscribe(
          "ticks_history",
          {
            ticks_history: symbol,
            style: "candles",
            granularity,
            count: 300,
            end: "latest",
          },
          (msg) => {
            if (msg.msg_type === "candles" && msg.candles?.length) {
              let state = estimator.update(Number(msg.candles[0].close));
              for (const c of msg.candles.slice(1)) state = estimator.update(Number(c.close));
              send("history", { candles: msg.candles, state });
            } else if (msg.msg_type === "ohlc" && msg.ohlc) {
              const state = estimator.update(Number(msg.ohlc.close));
              send("candle", { candle: msg.ohlc, state });
              if (estimator.shouldPersistSnapshot()) persistSnapshot(state);
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
