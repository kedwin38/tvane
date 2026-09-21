import WebSocket from "ws";

// One Deriv WebSocket connection, request/response + subscription
// multiplexing. This is the reusable core behind both the unauthenticated
// market-data connection (lib/deriv/market.ts) and each logged-in user's
// own authorized connection (lib/deriv/user-connections.ts) — per
// docs/PROJECT_SPECIFICATION.md section 5, a multi-tenant build needs one
// connection per end user, each authorized with that user's own token,
// never a single connection multiplexing every user's trades.

type PendingRequest = { resolve: (value: any) => void; reject: (reason: any) => void };
type SubscriptionHandler = (data: any) => void;

const DEFAULT_WS_URL = "wss://ws.derivws.com/websockets/v3";

export class DerivSocket {
  private ws: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private reqId = 1;
  private pending = new Map<number, PendingRequest>();
  private subscriptions = new Map<string, Set<SubscriptionHandler>>();
  private subscriptionIds = new Map<string, string>();
  private accountInfo: any = null;
  private closed = false;
  private lastActivity = Date.now();
  private wsUrl: string;

  constructor(
    private appId: string,
    private token?: string,
    private onAuthorized?: (info: any) => void,
    wsUrl?: string
  ) {
    this.wsUrl = wsUrl ?? process.env.DERIV_WS_URL ?? DEFAULT_WS_URL;
  }

  get idleMs() {
    return Date.now() - this.lastActivity;
  }

  private key(msgType: string, discriminator?: string) {
    return discriminator ? `${msgType}:${discriminator}` : msgType;
  }

  async connect(): Promise<void> {
    if (this.closed) throw new Error("DerivSocket has been closed.");
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;

    this.connecting = new Promise((resolve, reject) => {
      const url = `${this.wsUrl}?app_id=${this.appId}`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.on("open", async () => {
        try {
          if (this.token) {
            const authRes = await this.request("authorize", { authorize: this.token });
            this.accountInfo = authRes.authorize;
            this.onAuthorized?.(this.accountInfo);
          }
          this.connecting = null;
          resolve();
        } catch (err) {
          this.connecting = null;
          reject(err);
        }
      });

      ws.on("message", (raw) => {
        this.lastActivity = Date.now();
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

        const streamKey = this.streamKeyFromMessage(msg);
        if (streamKey && this.subscriptions.has(streamKey)) {
          for (const handler of this.subscriptions.get(streamKey)!) handler(msg);
        }
      });

      ws.on("close", () => {
        this.ws = null;
        this.connecting = null;
        if (!this.closed) {
          setTimeout(() => this.connect().catch(() => {}), 1500);
        }
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
    this.lastActivity = Date.now();
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
      setTimeout(() => {
        if (this.pending.has(req_id)) {
          this.pending.delete(req_id);
          reject(new Error(`Deriv request "${msgType}" timed out`));
        }
      }, 15000);
    });
  }

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
    onUpdate(first);

    return async () => {
      this.subscriptions.get(streamKey)?.delete(onUpdate);
      if (this.subscriptions.get(streamKey)?.size === 0) {
        const subId = this.subscriptionIds.get(streamKey);
        if (subId) {
          try {
            await this.request("forget", { forget: subId });
          } catch {
            /* connection may already be gone */
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

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}
