import { getCurrentUser } from "@/lib/auth/user-session";
import { getUserSocket } from "@/lib/deriv/user-connections";
import { getLiveState } from "@/lib/intelligence/registry";
import { digitalFairValue } from "@/lib/intelligence/layer3-pricing";

const MINUTES_PER_YEAR = 365 * 24 * 60;

/** Fair value only applies to Rise/Fall priced in calendar minutes — see
 * the constraint documented in lib/intelligence/layer3-pricing.ts on
 * why tick-count durations are out of scope. */
async function computeFairValue(contractParams: Record<string, any>, proposal: any) {
  if (contractParams.duration_unit !== "m") return null;
  if (contractParams.contract_type !== "CALL" && contractParams.contract_type !== "PUT") return null;

  const live = await getLiveState(contractParams.symbol);
  if (!live) return null;

  const years = Number(contractParams.duration) / MINUTES_PER_YEAR;
  const sigmaAnnual = live.state.annualizedSigmaPct / 100;
  const barrier = Number(proposal.spot ?? live.spot);

  return digitalFairValue({
    spot: live.spot,
    barrier,
    sigmaAnnual,
    years,
    direction: contractParams.contract_type === "CALL" ? "above" : "below",
    payout: Number(proposal.payout),
    quotedCost: Number(proposal.ask_price),
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("params");
  if (!raw) {
    return new Response(JSON.stringify({ error: "missing params" }), { status: 400 });
  }

  let contractParams: Record<string, any>;
  try {
    contractParams = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: "invalid params" }), { status: 400 });
  }

  const subKey = `${user.id}:${contractParams.symbol}:${contractParams.contract_type}:${Date.now()}:${Math.random()}`;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const socket = await getUserSocket(user.id);
        unsubscribe = await socket.subscribe(
          "proposal",
          {
            proposal: 1,
            symbol: contractParams.symbol,
            contract_type: contractParams.contract_type,
            amount: contractParams.amount,
            basis: contractParams.basis ?? "stake",
            currency: contractParams.currency ?? "USD",
            // Accumulators have no fixed duration — they run until sold
            // or the range is breached — and take growth_rate instead.
            ...(contractParams.contract_type === "ACCU"
              ? { growth_rate: contractParams.growth_rate }
              : {
                  duration: contractParams.duration,
                  duration_unit: contractParams.duration_unit,
                  ...(contractParams.barrier ? { barrier: contractParams.barrier } : {}),
                }),
          },
          (msg) => {
            if (msg.error) {
              send("error", { message: msg.error.message });
              return;
            }
            if (msg.proposal) {
              computeFairValue(contractParams, msg.proposal)
                .then((fairValue) => send("quote", { ...msg.proposal, fairValue }))
                .catch(() => send("quote", msg.proposal));
            }
          },
          { streamType: "proposal", discriminator: subKey }
        );
      } catch (err: any) {
        send("error", { message: err?.message ?? "proposal stream failed" });
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
