import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getMarketDataProvider } from "../services/market-data/ProviderFactory";
import { SymbolNotSupportedError, ProviderUnavailableError } from "../services/market-data/Errors";
import { generateRecommendation, type Recommendation } from "../services/market-data/recommendation/RecommendationEngine";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query cannot be empty"),
});

export async function searchStocks(req: Request, res: Response) {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.flatten().fieldErrors });
  }

  const { q } = parsed.data;
  const provider = getMarketDataProvider();

  try {
    const results = await provider.searchSymbol(q);
    return res.status(200).json({ results });
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      // PRD 5.4/12: fallback state, don't expose raw backend errors
      return res.status(503).json({
        error: "Stock data is temporarily unavailable. Please try again shortly.",
      });
    }
    console.error("Unexpected error in searchStocks:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

const selectSchema = z.object({
  ticker: z.string().trim().min(1),
  exchange: z.enum(["NYSE", "TSX"]),
});

/**
 * Called when a user clicks a search result to open the stock detail
 * page. Records the search in SearchHistory (PRD 5.6) and returns the
 * current quote plus a Buy/Hold/Sell recommendation (PRD 4.4/5.5).
 */
export async function selectStock(req: Request, res: Response) {
  const parsed = selectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.flatten().fieldErrors });
  }

  const { ticker, exchange } = parsed.data;
  const userId = req.user!.userId;
  const provider = getMarketDataProvider();

  try {
    const quote = await provider.getQuote({ ticker, exchange });

    // Fetch ~2 weeks of daily candles -- enough to reliably cover at
    // least 5 trading days even accounting for weekends/holidays.
    const now = Math.floor(Date.now() / 1000);
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60;
    const daily = await provider.getHistoricalDaily({ ticker, exchange }, fourteenDaysAgo, now);

    let recommendation: Recommendation;
    if (daily.candles.length < 6) {
      // Not enough history yet (e.g. a recently-listed stock) --
      // degrade gracefully rather than crash or guess.
      recommendation = {
        signal: "HOLD" as const,
        explanation:
          "Not enough recent trading history is available yet to generate a confident recommendation.",
      };
    } else {
      const last5 = daily.candles.slice(-5);
      const fiveDayAverage = last5.reduce((sum, c) => sum + c.close, 0) / last5.length;

      // noUncheckedIndexedAccess means this index access is typed
      // Candle | undefined even though we already checked
      // daily.candles.length >= 6 above -- TypeScript can't connect
      // that length check to this specific index, so it needs an
      // explicit guard here regardless.
      const fiveDaysAgoCandle = daily.candles[daily.candles.length - 6];

      if (!fiveDaysAgoCandle) {
        recommendation = {
          signal: "HOLD" as const,
          explanation:
            "Not enough recent trading history is available yet to generate a confident recommendation.",
        };
      } else {
        const priceFiveDaysAgo = fiveDaysAgoCandle.close;
        const weeklyChangePercent =
          ((quote.currentPrice - priceFiveDaysAgo) / priceFiveDaysAgo) * 100;

        recommendation = generateRecommendation({
          currentPrice: quote.currentPrice,
          todayPercentChange: quote.percentChangeToday,
          weeklyChangePercent,
          fiveDayAverage,
        });
      }
    }

    // Fire-and-forget isn't appropriate here -- if this fails silently
    // the user never knows their history isn't being tracked. Await
    // it, but don't let a history-write failure block returning the
    // quote the user actually asked for.
    try {
      await prisma.searchHistory.create({
        data: { userId, ticker, exchange },
      });
    } catch (historyErr) {
      console.error("Failed to write search history:", historyErr);
    }

    return res.status(200).json({ quote, recommendation });
  } catch (err) {
    if (err instanceof SymbolNotSupportedError) {
      return res.status(422).json({
        error: `${ticker} (${exchange}) isn't supported yet. Currently only NYSE stocks are available.`,
      });
    }
    if (err instanceof ProviderUnavailableError) {
      return res.status(503).json({
        error: "Stock data is temporarily unavailable. Please try again shortly.",
      });
    }
    console.error("Unexpected error in selectStock:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

/** Returns the user's most recent searches, one entry per unique
 *  stock (most recent visit wins) -- PRD 5.6 / user story "see my
 *  recent searches." */
export async function getSearchHistory(req: Request, res: Response) {
  const userId = req.user!.userId;

  const history = await prisma.searchHistory.findMany({
    where: { userId },
    distinct: ["ticker", "exchange"],
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return res.status(200).json({ history });
}