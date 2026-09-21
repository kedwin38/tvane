import WebSocket from "ws";

// Server-side-only singleton connection to the Deriv WebSocket API.
// The API token lives here and only here — it is never sent to the
// browser. The frontend talks to our own Next.js route handlers, which
// relay data derived from this connection.
//
// Per the platform architecture (docs/PROJECT_SPECIFICATION.md, section
// 5): a production multi-tenant build needs one connection per end user,
// each authorized with that user's own token. This single-connection
// client is the testing/demo shape for one account (the token supplied
// for development) — the per-user connection manager is a build-phase
// item, not implemented here.

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
};

type SubscriptionHandler = (data: any) => void;

const DERIV_WS_URL = process.env.DERIV_WS_URL ?? "wss://ws.derivws.com/websockets/v3";
const DERIV_APP_ID = process.env.DERIV_APP_ID ?? "1089";
const DERIV_API_TOKEN = process.env.DERIV_API_TOKEN;

class DerivClient {
  private ws: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private reqId = 1;
  private pending = new Map<number, PendingRequest>();
  private subscriptions = new Map<string, Set<SubscriptionHandler>>();
  private subscriptionIds = new Map<string, string>(); // key -> deriv subscription id
  private accountInfo: any = null;

  private key(msgType: string, discriminator?: string) {
    return discriminator ? `${msgType}:${discriminator}` : msgType;
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;

    this.connecting = new Promise((resolve, reject) => {
      const url = `${DERIV_WS_URL}?app_id=${DERIV_APP_ID}`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.on("open", async () => {
        try {
          if (DERIV_API_TOKEN) {
            const authRes = await this.request("authorize", { authorize: DERIV_API_TOKEN });
            this.accountInfo = authRes.authorize;
          }
          this.connecting = null;
          resolve();
        } catch (err) {
          this.connecting = null;
          reject(err);
        }
      });

      ws.on("message", (raw) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (msg.req_id && this.pending.has(msg.req_id)) {
          const p = this.pending.get(msg.req_id)!;
          this.pending.delete(msg.req_id);
          if (msg.error) p.reject(msg.error);
          else p.resolve(msg);
        }

        // route streaming updates (ticks, ohlc, proposal, balance...) to subscribers
        const streamKey = this.streamKeyFromMessage(msg);
        if (streamKey && this.subscriptions.has(streamKey)) {
          for (const handler of this.subscriptions.get(streamKey)!) {
            handler(msg);
          }
        }
      });

      ws.on("close", () => {
        this.ws = null;
        this.connecting = null;
        // simple auto-reconnect for the dev/testing setup
        setTimeout(() => this.connect().catch(() => {}), 1500);
      });

      ws.on("error", (err) => {
        if (this.connecting) {
          this.connecting = null;
          reject(err);
        }
      });
    });

    return this.connecting;
  }

  private streamKeyFromMessage(msg: any): string | null {
    if (msg.msg_type === "tick" && msg.tick) return this.key("tick", msg.tick.symbol);
    if (msg.msg_type === "ohlc" && msg.ohlc) return this.key("ohlc", `${msg.ohlc.symbol}:${msg.ohlc.granularity}`);
    if (msg.msg_type === "proposal" && msg.proposal) return this.key("proposal", msg.echo_req?.__sub_key);
    if (msg.msg_type === "balance" && msg.balance) return this.key("balance");
    return null;
  }

  async request(msgType: string, payload: Record<string, any>): Promise<any> {
    await this.connect();
    const req_id = this.reqId++;
    const body = JSON.stringify({ ...payload, req_id });

    return new Promise((resolve, reject) => {
      this.pending.set(req_id, { resolve, reject });
      this.ws!.send(body, (err) => {
        if (err) {
          this.pending.delete(req_id);
          reject(err);
        }
      });
      // safety timeout so a dropped response can't hang a caller forever
      setTimeout(() => {
        if (this.pending.has(req_id)) {
          this.pending.delete(req_id);
          reject(new Error(`Deriv request "${msgType}" timed out`));
        }
      }, 15000);
    });
  }

  /** Subscribe to a streaming message type; returns an unsubscribe function. */
  async subscribe(
    msgType: string,
    payload: Record<string, any>,
    onUpdate: SubscriptionHandler,
    opts: { discriminator?: string; streamType?: string } = {}
  ): Promise<() => void> {
    await this.connect();
    const streamKey = this.key(opts.streamType ?? msgType, opts.discriminator);

    if (!this.subscriptions.has(streamKey)) this.subscriptions.set(streamKey, new Set());
    this.subscriptions.get(streamKey)!.add(onUpdate);

    const requestBody =
      msgType === "proposal" && opts.discriminator
        ? { ...payload, __sub_key: opts.discriminator }
        : payload;
    const first = await this.request(msgType, { ...requestBody, subscribe: 1 });
    const subId = first.subscription?.id;
    if (subId) this.subscriptionIds.set(streamKey, subId);
    // deliver the first payload immediately too
    onUpdate(first);

    return async () => {
      this.subscriptions.get(streamKey)?.delete(onUpdate);
      if (this.subscriptions.get(streamKey)?.size === 0) {
        const subId = this.subscriptionIds.get(streamKey);
        if (subId) {
          try {
            await this.request("forget", { forget: subId });
          } catch {
            /* connection may already be gone; nothing to clean up */
          }
        }
        this.subscriptionIds.delete(streamKey);
        this.subscriptions.delete(streamKey);
      }
    };
  }

  getAccountInfo() {
    return this.accountInfo;
  }
}

// Node module caching gives us a true singleton across route handlers
// within the same server process.
const globalForDeriv = globalThis as unknown as { __derivClient?: DerivClient };
export const derivClient = globalForDeriv.__derivClient ?? new DerivClient();
globalForDeriv.__derivClient = derivClient;
