"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

type VolState = { sigmaPerBar: number; annualizedSigmaPct: number; samples: number };

export function Chart({ symbol, granularity = 60 }: { symbol: string; granularity?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [volState, setVolState] = useState<VolState | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceDelta, setPriceDelta] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#8FA1B0",
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.035)" },
        horzLines: { color: "rgba(255,255,255,0.035)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(47,224,203,0.35)", width: 1, style: 2, labelBackgroundColor: "#111822" },
        horzLine: { color: "rgba(47,224,203,0.35)", width: 1, style: 2, labelBackgroundColor: "#111822" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#2FE0CB",
      downColor: "#3A4655",
      borderUpColor: "#2FE0CB",
      borderDownColor: "#3A4655",
      wickUpColor: "#2FE0CB",
      wickDownColor: "#3A4655",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/deriv/stream?symbol=${symbol}&granularity=${granularity}`);
    let firstClose: number | null = null;

    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("error", () => setConnected(false));

    es.addEventListener("history", (evt) => {
      const { candles, state } = JSON.parse((evt as MessageEvent).data);
      const bars = candles.map((c: any) => ({
        time: c.epoch as UTCTimestamp,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      }));
      candleSeriesRef.current?.setData(bars);
      chartRef.current?.timeScale().fitContent();
      if (bars.length) {
        firstClose = bars[0].open;
        setLastPrice(bars[bars.length - 1].close);
      }
      setVolState(state);
    });

    es.addEventListener("candle", (evt) => {
      const { candle, state } = JSON.parse((evt as MessageEvent).data);
      const bar = {
        time: candle.open_time as UTCTimestamp,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      };
      candleSeriesRef.current?.update(bar);
      setLastPrice(bar.close);
      if (firstClose) setPriceDelta(((bar.close - firstClose) / firstClose) * 100);
      setVolState(state);
    });

    return () => es.close();
  }, [symbol, granularity]);

  return (
    <div className="relative flex h-full flex-col rounded-lg border border-hairline bg-panel">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-medium text-text-1">{symbol}</span>
          {lastPrice !== null && (
            <span className="font-mono tabular text-sm text-text-1">
              {lastPrice.toFixed(3)}
            </span>
          )}
          {priceDelta !== 0 && (
            <span
              className={`font-mono tabular text-xs ${
                priceDelta >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {priceDelta >= 0 ? "+" : ""}
              {priceDelta.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {volState && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-text-2">
              <span className="label-caps text-text-3">σ live</span>
              <span className="tabular text-teal">{volState.annualizedSigmaPct.toFixed(1)}%</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "live-dot bg-teal" : "bg-text-3"
              }`}
            />
            <span className="label-caps text-text-3">{connected ? "Live" : "Connecting"}</span>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="min-h-[420px] flex-1" />
    </div>
  );
}
