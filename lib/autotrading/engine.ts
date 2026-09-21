import "server-only";
import { prisma } from "@/lib/db/prisma";
import { subscribeDigitChanges, getLiveState } from "@/lib/intelligence/registry";
import { getUserSocket } from "@/lib/deriv/user-connections";
import type { DigitStatusChange } from "@/lib/intelligence/layer2-digits";

// The one automated strategy this build implements: trade DIGITDIFF
// against a digit for as long as Layer 2's SPRT monitor has it flagged
// "depressed" (confirmed below-uniform frequency) — that is exactly the
// condition under which "differs" wins more often than the ~90% a
// payout is typically priced against. See docs/PROJECT_SPECIFICATION.md
// and lib/intelligence/layer2-digits.ts for why this is a measured
// deviation, not a claim of guaranteed edge.
//
// Risk controls here are named for what they actually enforce — total
// stake committed and trade count per day — not "loss", because
// tracking realized P/L would require polling contract settlement
// (proposal_open_contract / profit_table) that this build doesn't do
// yet. Calling a stake cap a "loss limit" would overstate what it is.

type ActiveStrategy = {
  strategyId: string;
  userId: string;
  symbol: string;
  stakeAmount: number;
  maxDailyStakeUsd: number;
  maxTradesPerDay: number;
  unsubscribe: () => void;
};

const globalForEngine = globalThis as unknown as {
  __autoStrategies?: Map<string, ActiveStrategy>;
  __autoEngineBootstrapped?: boolean;
};
const active = globalForEngine.__autoStrategies ?? new Map<string, ActiveStrategy>();
globalForEngine.__autoStrategies = active;

function todayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function handleDepressedDigit(strategy: ActiveStrategy, change: DigitStatusChange) {
  const live = await getLiveState(strategy.symbol);
  if (!live || !live.state.falsification.modelValid) {
    await prisma.autoTradeLog.create({
      data: {
        strategyId: strategy.strategyId,
        userId: strategy.userId,
        symbol: strategy.symbol,
        digit: change.digit,
        contractType: "DIGITDIFF",
        stakeAmount: strategy.stakeAmount,
        outcome: "rejected",
        reason: "Layer 1 model flagged invalid for this symbol — auto-trading paused as a kill-switch.",
      },
    });
    return;
  }

  const since = todayStart();
  const todayLogs = await prisma.autoTradeLog.findMany({
    where: { strategyId: strategy.strategyId, outcome: "executed", createdAt: { gte: since } },
    select: { stakeAmount: true },
  });
  const stakeToday = todayLogs.reduce((sum, l) => sum + l.stakeAmount, 0);

  if (todayLogs.length >= strategy.maxTradesPerDay) {
    await prisma.autoTradeLog.create({
      data: {
        strategyId: strategy.strategyId,
        userId: strategy.userId,
        symbol: strategy.symbol,
        digit: change.digit,
        contractType: "DIGITDIFF",
        stakeAmount: strategy.stakeAmount,
        outcome: "rejected",
        reason: `Daily trade cap reached (${strategy.maxTradesPerDay}).`,
      },
    });
    return;
  }
  if (stakeToday + strategy.stakeAmount > strategy.maxDailyStakeUsd) {
    await prisma.autoTradeLog.create({
      data: {
        strategyId: strategy.strategyId,
        userId: strategy.userId,
        symbol: strategy.symbol,
        digit: change.digit,
        contractType: "DIGITDIFF",
        stakeAmount: strategy.stakeAmount,
        outcome: "rejected",
        reason: `Daily stake cap would be exceeded (committed ${stakeToday.toFixed(2)}, cap ${strategy.maxDailyStakeUsd}).`,
      },
    });
    return;
  }

  try {
    const socket = await getUserSocket(strategy.userId);
    const proposalRes = await socket.request("proposal", {
      proposal: 1,
      symbol: strategy.symbol,
      contract_type: "DIGITDIFF",
      amount: strategy.stakeAmount,
      basis: "stake",
      currency: "USD",
      duration: 1,
      duration_unit: "t",
      barrier: String(change.digit),
    });
    if (proposalRes.error) throw new Error(proposalRes.error.message);

    const buyRes = await socket.request("buy", {
      buy: proposalRes.proposal.id,
      price: proposalRes.proposal.ask_price,
    });
    if (buyRes.error) throw new Error(buyRes.error.message);

    await prisma.autoTradeLog.create({
      data: {
        strategyId: strategy.strategyId,
        userId: strategy.userId,
        symbol: strategy.symbol,
        digit: change.digit,
        contractType: "DIGITDIFF",
        stakeAmount: strategy.stakeAmount,
        outcome: "executed",
        contractId: String(buyRes.buy.contract_id),
        reason: `Digit ${change.digit} flagged depressed (${change.empiricalPct.toFixed(2)}% vs 10% expected).`,
      },
    });
  } catch (err: any) {
    await prisma.autoTradeLog.create({
      data: {
        strategyId: strategy.strategyId,
        userId: strategy.userId,
        symbol: strategy.symbol,
        digit: change.digit,
        contractType: "DIGITDIFF",
        stakeAmount: strategy.stakeAmount,
        outcome: "error",
        reason: err?.message ?? "Unknown execution error.",
      },
    });
  }
}

export async function registerStrategy(strategy: {
  id: string;
  userId: string;
  symbol: string;
  stakeAmount: number;
  maxDailyStakeUsd: number;
  maxTradesPerDay: number;
}) {
  if (active.has(strategy.id)) return;

  const runtime: ActiveStrategy = {
    strategyId: strategy.id,
    userId: strategy.userId,
    symbol: strategy.symbol,
    stakeAmount: strategy.stakeAmount,
    maxDailyStakeUsd: strategy.maxDailyStakeUsd,
    maxTradesPerDay: strategy.maxTradesPerDay,
    unsubscribe: () => {},
  };

  const unsubscribe = await subscribeDigitChanges(strategy.symbol, (changes) => {
    for (const change of changes) {
      if (change.status === "depressed") handleDepressedDigit(runtime, change).catch(() => {});
    }
  });
  runtime.unsubscribe = unsubscribe;
  active.set(strategy.id, runtime);
}

export function unregisterStrategy(strategyId: string) {
  const runtime = active.get(strategyId);
  if (runtime) {
    runtime.unsubscribe();
    active.delete(strategyId);
  }
}

export function isStrategyActive(strategyId: string): boolean {
  return active.has(strategyId);
}

/** Re-registers every enabled strategy from the DB — must run once per
 * server process, since the in-memory `active` map doesn't survive a
 * restart even though the `enabled` flag in Postgres does. */
export async function ensureEngineBootstrapped() {
  if (globalForEngine.__autoEngineBootstrapped) return;
  globalForEngine.__autoEngineBootstrapped = true;

  const enabled = await prisma.autoStrategy.findMany({ where: { enabled: true } });
  for (const s of enabled) {
    await registerStrategy(s).catch(() => {});
  }
}
