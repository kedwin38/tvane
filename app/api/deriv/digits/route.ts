import { getMarketSocket } from "@/lib/deriv/market";
import { DigitTracker } from "@/lib/intelligence/layer2-digits";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Layer 2 live stream: raw ticks (not candles — Digits contracts settle
// on the last digit of the tick price, so this needs per-tick
// resolution, not 1-minute bars) feeding the SPRT-based digit monitor.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "R_100";

  const encoder = new TextEncoder();
  const tracker = new DigitTracker(symbol);
  let unsubscribe: (() => void) | null = null;

  const persistChanges = (
    changes: ReturnType<DigitTracker["update"]>["changes"]
  ) => {
    if (!changes.length) return;
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
          "ticks",
          { ticks: symbol },
          (msg) => {
            if (msg.msg_type !== "tick" || !msg.tick) return;
            const { states, changes } = tracker.update(Number(msg.tick.quote));
            send("digits", { states, sampleCount: tracker.sampleCount, epoch: msg.tick.epoch });
            persistChanges(changes);
          },
          { streamType: "tick", discriminator: symbol }
        );
      } catch (err: any) {
        send("error", { message: err?.message ?? "digit stream failed" });
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
