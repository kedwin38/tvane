-- CreateTable
CREATE TABLE "DigitSignal" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "digit" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "empiricalPct" DOUBLE PRECISION NOT NULL,
    "llr" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DigitSignal_symbol_createdAt_idx" ON "DigitSignal"("symbol", "createdAt");

