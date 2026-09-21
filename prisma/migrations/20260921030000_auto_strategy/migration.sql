-- CreateTable
CREATE TABLE "AutoStrategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "stakeAmount" DOUBLE PRECISION NOT NULL,
    "maxDailyStakeUsd" DOUBLE PRECISION NOT NULL,
    "maxTradesPerDay" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoTradeLog" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "digit" INTEGER NOT NULL,
    "contractType" TEXT NOT NULL,
    "stakeAmount" DOUBLE PRECISION NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoTradeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoStrategy_userId_idx" ON "AutoStrategy"("userId");

-- CreateIndex
CREATE INDEX "AutoTradeLog_strategyId_createdAt_idx" ON "AutoTradeLog"("strategyId", "createdAt");

-- CreateIndex
CREATE INDEX "AutoTradeLog_userId_createdAt_idx" ON "AutoTradeLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AutoStrategy" ADD CONSTRAINT "AutoStrategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

