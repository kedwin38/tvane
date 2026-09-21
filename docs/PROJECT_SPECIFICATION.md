# TIDEVANE — Project Specification

*Read the flow. Trade the truth.*

---

## 0. Reconciling the tagline

"Trade the truth" only sits well next to "probability over certainty" once **truth** is defined precisely — and once it is, the tagline stops being a tension and becomes the most accurate description of what Tidevane actually does.

> **Tidevane does not predict the future. It measures the present with enough precision that the present becomes tradeable.**

Every edge this platform trades — a digit distribution that deviates from what a quote implies, a contract priced away from its live fair value, a regime shift confirmed by a statistical test — is a fact about *right now*, established with evidence and a stated confidence interval. None of it is a forecast of *what happens next*. "Truth" refers to the correctly-measured present state of the market and its pricing, not to a certain outcome. Confidence, distributions, and invalidation conditions attach to that truth the same way they'd attach to any scientific measurement — the claim is precision of measurement, not certainty of outcome.

This makes the tagline system internally consistent:

- **Read the flow.** — observe the continuous, changing market.
- **Trade the truth.** — act only on what has been measured and evidenced, never on a narrative or a hunch.

Doc updates carried through from this reconciliation:
- Brand Promise becomes: *"Turn movement into information — and act only on the information that has been verified."*
- Add to Brand Philosophy, directly under "Probability over certainty": *"Truth, in Tidevane's vocabulary, means a measured and evidenced present state — not a guaranteed future. The system never claims to know what happens next; it claims to know, precisely, what is true right now."*
- Voice guidance gains one more preferred/avoid pair: prefer *"The measured fair value diverges from the quoted price by 0.4%, with 92% confidence."* over *"We know this contract is mispriced."* — the second oversells certainty even though it's directionally the same claim.

Everything else in the brand document (pillars, personality, information hierarchy, visual direction) already holds together — it doesn't need to change to accommodate this, it needed the definition above to make explicit what it was already implying.

---

## 1. Product Overview

Tidevane is a third-party trading platform built on the Deriv API, offering three ways to trade every market Deriv exposes:

1. **Manual Trading** — a precision instrument-panel interface for placing trades by hand, with live fair-value context shown alongside every quote.
2. **Tidevane Intelligence (Auto Trading)** — Tidevane's own statistically-grounded strategy engines, running the edge-detection architecture designed for this platform, user-enabled per symbol/contract with explicit risk limits.
3. **Strategy Studio (User Bots)** — a sandboxed environment where users bring or build their own automated strategies, including import of existing Deriv DBot XML strategies, all executed through Tidevane's shared risk and execution infrastructure rather than a free-standing script.

All three modes share one execution core, one risk core, and one data core. They differ only in *where the trading decision comes from* — a human, Tidevane's own models, or a user's own logic.

---

## 2. System Architecture

### 2.1 Two intelligence engines, one shared spine

The platform is built around a hard architectural distinction established during research: Deriv's **synthetic/derived indices** are provably memoryless diffusions (near-zero autocorrelation, no volatility clustering, no seasonality — confirmed via direct statistical analysis of live-format data), while **real markets** (forex, stocks, commodities, crypto) exhibit the opposite — fat tails, clustering, regime persistence. One predictive architecture cannot honestly serve both.

```
                        ┌─────────────────────────────┐
                        │      Shared Platform Core     │
                        │  Connection Mgr · Risk Engine  │
                        │  Execution Engine · Backtest   │
                        │  Ledger · Notification · UI    │
                        └───────────┬─────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                                        │
   ┌────────────▼────────────┐          ┌────────────────▼───────────┐
   │ Synthetic Intelligence    │          │  Real-Market Intelligence   │
   │ Engine (Volatility, Crash/│          │  Engine (Forex, Stocks,     │
   │ Boom, Step, Range Break)  │          │  Commodities, Crypto)       │
   │                           │          │                              │
   │ Layer 1: Live GBM         │          │ Layer 1: Regime/feature       │
   │ parameter estimator +     │          │ estimator (HMM regime         │
   │ self-falsification        │          │ detection, realized vol,      │
   │                           │          │ macro calendar overlay)       │
   │ Layer 2: Digit-distribution│          │ Layer 2: Classical factor     │
   │ edge detector (SPRT)      │          │ signals (momentum, carry,     │
   │                           │          │ mean-reversion, vol           │
   │ Layer 3: Closed-form fair-│          │ risk-premium)                 │
   │ value pricer per contract │          │                              │
   │ family (GBM-based)        │          │ Layer 3: Model-based fair    │
   │                           │          │ value under stochastic-vol    │
   └────────────┬──────────────┘          └───────────────┬─────────────┘
                │                                          │
                └───────────────────┬──────────────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │  Layer 4: Execution Engine │
                        │  (fractional Kelly sizing, │
                        │  proposal-id atomic buy,    │
                        │  risk gates, correlation    │
                        │  caps)                      │
                        ├────────────────────────────┤
                        │  Layer 5: Backtest Harness  │
                        │  (cost-injected replay)      │
                        ├────────────────────────────┤
                        │  Layer 6: Live Validation &  │
                        │  Kill-Switch (CUSUM control, │
                        │  periodic re-audit)          │
                        └────────────────────────────┘
```

### 2.2 Tidevane Intelligence — the STATE/SHIFT/EVIDENCE/CONFIDENCE/RISK/TRACE mapping

The brand's information hierarchy is not decorative — it is the literal output schema of the intelligence layers, surfaced identically whether a human is reading it manually or a strategy is consuming it automatically:

| Brand concept | Engine source | What it actually is |
|---|---|---|
| **STATE** | Layer 1 | Current live-estimated μ̂, σ̂ (or regime label, for real markets), with the window and update timestamp |
| **SHIFT** | Layer 1 self-falsification | Result of the rolling ACF / Ljung-Box / kurtosis battery — has the model's core assumption changed |
| **EVIDENCE** | Layer 2 / Layer 3 | The measured deviation: digit-frequency skew vs. quote-implied probability, or fair-value vs. quoted-price gap |
| **CONFIDENCE** | Layer 2 / Layer 3 | SPRT decision boundary status, or the bootstrapped/delta-method confidence interval on fair value |
| **RISK / INVALIDATION** | Layer 6 | The explicit condition that would break the current trade thesis — stated, not hidden, before the trade is placed |
| **TRACE** | Layer 5 / Layer 6 logs | The full backtest-cost-adjusted expectancy and live realized-vs-modeled PnL history for this exact signal |

Every trade — manual, auto, or user-bot — that touches a Tidevane Intelligence signal carries this six-field record. It is what "traceability" (brand pillar 04) means in practice: not a marketing claim, a literal data structure attached to every decision.

---

## 3. Trading Modes

### 3.1 Manual Trading

A human-driven order ticket, redesigned around the instrument-panel visual direction rather than a retail-binary look:

- **Symbol/contract browser** driven live by `active_symbols` + `contracts_for` + `landing_company_details` — never a hardcoded menu, since availability differs by account/jurisdiction.
- **Live proposal panel**: subscribed `proposal` stream, with the STATE/EVIDENCE/CONFIDENCE strip rendered alongside the quote whenever a Tidevane Intelligence fair-value model exists for that contract — shown as *context*, never as a flashing buy signal. This is the direct design answer to the "gambling-interface" tension: information is shown as measurement, not as an imperative.
- **Position management**: live `proposal_open_contract`, `portfolio`, `statement`, `profit_table` — with the same restrained charting language (confidence regions, regime boundaries, no rainbow palettes, no oversized counters) applied to open-position P&L.
- **Contract-family coverage**: Rise/Fall, Higher/Lower, Touch/No Touch, Digits (Matches/Differs, Even/Odd, Over/Under), Accumulators, Multipliers, Turbos, Vanillas, Lookbacks, Reset, Asians — surfaced per-symbol exactly as `contracts_for` reports, not assumed.

### 3.2 Auto Trading — Tidevane Intelligence

Users enable specific Tidevane-built strategies per symbol, each one a concrete instantiation of the Synthetic or Real-Market engine:

- Strategy catalogue entries are not "signals to buy" — they are named, documented models (e.g. *"Digit-distribution deviation, Volatility indices"*, *"Barrier fair-value arbitrage, Touch/No-Touch"*) each carrying its own live STATE/SHIFT/EVIDENCE/CONFIDENCE/RISK/TRACE panel and its own historical expectancy, computed through the cost-injected backtest harness — never the raw, cost-free number a naive backtest would produce.
- User controls: per-strategy stake sizing (defaulted to fractional Kelly, adjustable down, never up past a platform-enforced ceiling), max concurrent exposure, max daily loss, and an explicit opt-in per symbol (nothing runs against a symbol whose model has failed self-falsification).
- Kill-switch behavior is visible, not silent: when Layer 6 pauses a strategy, the UI shows *why* (which invalidation condition fired), consistent with "risk/invalidation" being a first-class, always-shown field rather than an apology after the fact.

### 3.3 Strategy Studio — user-authored automation

Three tiers, increasing in power and required sandboxing:

1. **DBot XML import** — users who already have strategies built in Deriv's own DBot (Blockly, XML-exported) can import them directly. Tidevane parses the XML block graph and re-targets its `proposal`/`buy`/`sell` calls through Tidevane's own execution core rather than running it as a bare client-side script — this is what makes the shared risk engine (stake caps, daily loss limits, correlation caps) apply uniformly even to imported bots, which raw DBot cannot enforce on its own.
2. **Tidevane Strategy Studio (visual)** — a block-based builder in the STATE/SHIFT/EVIDENCE vocabulary rather than DBot's generic logic blocks: conditions are expressed as "when EVIDENCE exceeds X at CONFIDENCE > Y," keeping user-built strategies legible in the same analytical language as Tidevane's own models.
3. **Code-based strategies (advanced)** — a sandboxed scripting environment (resource-limited, network-restricted, no filesystem/process access) exposing a typed API over the live data/pricing/execution layers, for users who want full programmatic control. Sandboxing is non-negotiable here: user code must not be able to bypass Layer 4's risk gates, make unbounded API calls, or exfiltrate other users' data.

All three tiers terminate in the same Layer 4 execution engine — a user bot's `buy` call is exactly as rate-limited, risk-gated, and logged as a Tidevane Intelligence trade.

---

## 4. Markets & Contract Coverage

Per the Deriv platform research already completed for this project:

- **Synthetic/derived indices**: Volatility Indices (incl. 1s variants), Crash/Boom, Step, Range Break, Basket Indices — the primary target for the Synthetic Intelligence Engine, given their well-defined generative statistics.
- **Real markets**: forex, stock indices, individual stocks, commodities, cryptocurrencies, ETFs — target for the Real-Market Intelligence Engine.
- **Contract types**: full coverage of Rise/Fall, Higher/Lower, Touch/No Touch, Digits family, Accumulators, Multipliers, Turbos, Vanillas, Lookbacks, Reset, Asians, High/Low Ticks, Only Ups/Downs — availability gated live per `contracts_for`/`landing_company_details`, never hardcoded.
- **MT5 / Trading Platform accounts**: supported for users who want to trade the same underlying through MT5 rather than Deriv's native contract types, using the `trading_platform_*`/`mt5_*` API family.
- **Copy Trading**: native Deriv copy-trading APIs (`copy_start`/`copy_stop`/`copytrading_list`/`copytrading_statistics`) exposed as a fourth, lighter-weight mode for users who want to follow another trader rather than run a strategy or trade manually.

---

## 5. Account, Auth & Multi-Tenant Connection Architecture

- **Per-user WebSocket connection**: one authenticated `wss://ws.derivws.com/websockets/v3?app_id=<TIDEVANE_APP_ID>` connection per active user session, each authorized via that user's own OAuth-derived token — never a shared backend connection multiplexing multiple users' trades.
- **OAuth2 "Login with Deriv"** as the primary onboarding path (PKCE-capable), with scoped API tokens as a fallback for advanced/API-first users.
- **Subscription lifecycle discipline**: every `subscribe:1` call (ticks, proposal, balance, portfolio, contract) is tracked per-connection and explicitly `forget`-ten when a user navigates away or a strategy is disabled — required given Deriv's dynamic, undocumented-globally rate limits (discovered live via `website_status.api_call_limits`).
- **Landing-company awareness**: every user's available markets, contract types, and leverage are resolved through `landing_company_details` at session start and re-checked on account changes — the platform must not assume a uniform product set across users.

---

## 6. Technology Stack (proposed)

- **Backend**: a service written directly against the raw WebSocket protocol (not the archived `python_deriv_api`), in a language suited to concurrent per-user connection handling — Node/TypeScript (natural fit with the actively-maintained `@deriv/deriv-api`) or a Go/Elixir backend for connection-manager concurrency at scale, with a separate quant service (Python, for the pricing/statistics engines — numpy/scipy/statsmodels) behind an internal API.
- **Frontend**: a modern reactive framework (React/TypeScript) built around the instrument-panel visual system — custom charting rather than an off-the-shelf retail trading widget library, since the brand's visual direction (confidence regions, regime boundaries, restrained grids) is not something stock charting libraries provide out of the box.
- **Data layer**: time-series storage for tick/candle history and strategy performance logs (e.g. a columnar/time-series store), plus a conventional relational store for accounts, strategies, and risk state.
- **Strategy Studio sandbox**: an isolated execution environment (container- or VM-level isolation, strict resource/time limits) for user code — this is a security-critical component and should be scoped and reviewed as its own subsystem before Strategy Studio ships.

---

## 7. Risk, Compliance & Safety Systems

- KYC/AML remains Deriv-side; Tidevane surfaces Deriv's verification prompts and account-status flags rather than reimplementing them.
- Tidevane's own risk layer (Layer 4/6) is additive on top of Deriv's account-level limits — platform-enforced stake ceilings, daily loss caps, and correlation limits apply regardless of whether the trade originated from manual entry, a Tidevane strategy, or a user bot.
- Given the app registers with Deriv and may earn markup via `app_id`, the business relationship falls under Deriv's Business Partners terms — legal review recommended before enabling markup/commission before launch.
- Brand-consistent risk communication: every automated decision states its own invalidation condition up front (RISK/INVALIDATION field) rather than only disclosing risk in a general terms-of-service document.

---

## 8. Build Phases

1. **Foundation**: connection manager, OAuth flow, manual trading (read-only + basic order ticket), `contracts_for`-driven UI — no intelligence layer yet, prove the plumbing.
2. **Synthetic Intelligence Engine v1**: Layer 1 estimator + self-falsification, Layer 2 digit-edge detector (SPRT), live-validated against real Deriv feeds before any capital allocation.
3. **Fair-value pricing (Layer 3)** for the highest-confidence contract families first (Digits, then Touch/No-Touch and Vanillas), each gated behind Layer 6 kill-switches from day one.
4. **Execution & risk core (Layer 4)**, wired to both manual and auto flows.
5. **Backtest harness with injected costs (Layer 5)** — required before any strategy is allowed to run live, not an afterthought.
6. **Auto Trading UI** exposing the STATE/SHIFT/EVIDENCE/CONFIDENCE/RISK/TRACE panel per strategy.
7. **Strategy Studio**: DBot XML import first (fastest path to user value, reuses existing execution core), then visual builder, then sandboxed code environment last (highest security surface).
8. **Real-Market Intelligence Engine**: only after the synthetic engine has live-validated track record, since the modeling approach is genuinely different and shouldn't be built speculatively ahead of the first engine proving itself.
