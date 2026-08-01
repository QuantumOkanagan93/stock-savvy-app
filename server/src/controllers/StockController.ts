import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getMarketDataProvider } from "../services/market-data/ProviderFactory";
import { SymbolNotSupportedError, ProviderUnavailableError } from "../services/market-data/Errors";
import { get } from "node:http";


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