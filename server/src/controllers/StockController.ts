import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getMarketDataProvider } from "../services/market-data/ProviderFactory";
import { SymbolNotSupportedError, ProviderUnavailableError } from "../services/market-data/Errors";
import { generateRecommendation } from "../services/market-data/recommendation/RecommendationEngine";
import type { Recommendation } from "../generated/prisma/enums";


const searchQuerySchema = z.object({
    q: z.string().trim().min(1, "Search query cannot be empty"),
});

export async function searchStocks(req: Request, res: Response) {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res
        .status(400)
        .json({ error: parsed.error.flatten().fieldErrors});
    }

    const { q } = parsed.data;
    const provider = getMarketDataProvider();

    try {
        const results = await provider.searchSymbol(q);
        return res.status(200).json({ results });
    } catch (err) {
        if (err instanceof ProviderUnavailableError) {
            //Fallback state, don't expose raw backend here
            return res.status(503).json({
                error: "Stock data is temporarily unavailable. Please try again shortly.",
            });
        }
        console.error("Unexpected error in searchStocks:", err);
        return res.status(500).json({ error: "Something went wrong. Please try again."});
    }
}

const selectSchema = z.object({
    ticker: z.string().trim().min(1),
    exchange: z.enum(["NYSE", "TSX"]),
});

/**
 * This is called when a user clicks a search result to open the detail apge
 * Records the search in SearchHistory and returns the current quote
 * So the detail page has something to render
 */
export async function selectStock(req: Request, res: Response) {
    const parsed = selectSchema.safeParse(req.body);

    if (!parsed.success) {
        return res
        .status(400)
        .json({ error: parsed.error.flatten().fieldErrors});
    }

    const { ticker, exchange } = parsed.data;
    const userId = req.user!.userId;
    const provider = getMarketDataProvider();

    try {
        const quote = await provider.getQuote({ ticker, exchange });

        //Fetch ~ 2 weeks of daily candles -- enough to reliably cover
        //at least 5 trading days even accounting for weekends/holidays
        const now = Math.floor(Date.now() / 1000);
        const fourteenDaysAgo = now - 14 * 24 * 60 * 60;
        const daily = await provider.getHistoricalDaily({ ticker, exchange }, fourteenDaysAgo, now);

        let recommendation: Recommendation;
        if (daily.candles.length < 6) {
            //not enough history yet
            //degrade gracefully rather than crash
            recommendation = {
                signal: "HOLD",
                explanation:
                    "Not enough recent trading history is available yet to generate a recommendation.",
            };
        } else {
            const last5 = daily.candles.slice(-5);
            const fiveDayAvg = last5.reduce((sum, c) => sum + c.close, 0) / last5.length;
            const priceFiveDaysAgo = daily.candles[daily.candles.length - 6]?.close;
            const weeklyChangePercent = 
            ((quote.currentPrice - priceFiveDaysAgo) / priceFiveDaysAgo) * 100;

            recommendation = generateRecommendation({
                currentPrice: quote.currentPrice,
                todayPercentChange: quote.percentChangeToday,
                weeklyChangePercent,
                fiveDayAverage,
            });
        }

        // If this fails, the user never knows their history isn't being tracked
        //Await it, but don't let a history-write failure block 
        //returning the quote the user actually asked for
        try {
            await prisma.searchHistory.create({
                data: { userId, ticker, exchange },
            });
        } catch (historyErr) {
            console.error("Failed to write search history:", historyErr);
        }
        return res.status(200).json({ quote });
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
        return res.status(500).json({ error: "Something went wrong. Please try again."});
    }
}

/**
 * Returns user's most recent searches, most recent first, one entry per unique stock
 */
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