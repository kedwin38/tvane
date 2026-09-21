import { getCurrentUser } from "@/lib/auth/user-session";
import { getUserSocket } from "@/lib/deriv/user-connections";

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
            duration: contractParams.duration,
            duration_unit: contractParams.duration_unit,
            ...(contractParams.barrier ? { barrier: contractParams.barrier } : {}),
          },
          (msg) => {
            if (msg.error) {
              send("error", { message: msg.error.message });
              return;
            }
            if (msg.proposal) send("quote", msg.proposal);
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
