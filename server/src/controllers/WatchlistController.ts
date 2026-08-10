import type { Request, Response } from "express";
import { promise, z } from "zod";
import { prisma } from "../lib/prisma";
import { getMarketDataProvider } from "../services/market-data/ProviderFactory";
import { generateRecommendation } from "../services/market-data/recommendation/RecommendationEngine";

const DEFAULT_WATCHLIST_NAME = "My Watchlist";

/**
 * The PRD mentions a singular watchlist rather than multiple named lists
 * so rather than making the user create/manage lists,
 * this quietly gets-or-creates one default list per user.
 * The schema still supports multiple lists later if that ever becomes a feature
 */
async function getOrCreateDefaultWatchlist(userId: string) {
    const existing = await prisma.watchlist.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
    });

    if (existing) return existing;

    return prisma.watchlist.create({
        data: { userId, name: DEFAULT_WATCHLIST_NAME},
    });
}

export async function getWatchlist(req: Request, res: Response) {
    const userId = req.user!.userId;

    const watchlist = await getOrCreateDefaultWatchlist(userId);

    const items = await prisma.watchlistItem.findMany({
        where: { watchlistId: watchlist.id },
        orderBy: { addedAt: "desc" },
    });

    return res.status(200).json({ items });
}

//Returns watchlist with LIVE quotes and Recommendations
export async function getWatchlistWithData(req: Request, res: Response) {
    const userId = req.user!.userId;

    const watchlist = await getOrCreateDefaultWatchlist(userId);

    const items = await prisma.watchlistItem.findMany({
        where: { watchlistId: watchlist.id },
        orderBy: { addedAt: "desc" },
    });

    if (items.length === 0) {
        return res.status(200).json({ items: [] });
    }

    const provider = getMarketDataProvider();
    const now = Math.floor(Date.now() / 1000);
    const twoHundredDaysAgo = now - 200 * 24 * 60 * 60;

    //Fetch live data for every stock in watchlist
    const enrichedItems = await Promise.all(
        items.map(async (item) => {
            try {
                //Get current quote
                const quote = await provider.getQuote({
                    ticker: item.ticker,
                    exchange: item.exchange,
                });

                //Get historical candles for recommendation engine
                const daily = await provider.getHistoricalDaily(
                    { ticker: item.ticker, exchange: item.exchange },
                    twoHundredDaysAgo,
                    now
                );

                //Generate recommendation
                const recommendation = generateRecommendation(
                    daily.candles,
                    quote.percentChangeToday
                );

                return {
                    ...item,
                    currentPrice: quote.currentPrice,
                    recommendation,
                };
            } catch (err) {
                //If fetch fails, return item without live data
                console.error(`Failed to fetch data for ${item.ticker}:`, err);
                return {
                    ...item,
                    currentPrice: null,
                    recommendation: null,
                };
            }
        })
    );
    return res.status(200).json({ items: enrichedItems });
}

const addSchema = z.object({
    ticker: z.string().trim().min(1),
    exchange: z.enum(["NYSE", "TSX"]),
});

export async function addToWatchlist(req: Request, res: Response) {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const { ticker, exchange } = parsed.data;
    const userId = req.user!.userId;
    const watchlist = await getOrCreateDefaultWatchlist(userId);

    //rather than erroring on duplicates, just return it instead of treating a repeat click as a conflict
    const existing = await prisma.watchlistItem.findUnique({
        where: {
            watchlistId_ticker_exchange: { watchlistId: watchlist.id, ticker, exchange },
        },
    });
    if (existing) {
        return res.status(200).json({ item: existing });
    }

    const item = await prisma.watchlistItem.create({
        data: { watchlistId: watchlist.id, ticker, exchange },
    });

    return res.status(201).json({ item });
}

const removeParamsSchema = z.object({
    itemId: z.string().min(1),
});

export async function removeFromWatchlist(req: Request, res: Response) {
    const parsed = removeParamsSchema.safeParse(req.params);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid watchlist item id" });
    }

    const { itemId } = parsed.data;
    const userId = req.user!.userId;

    //Confirm the item actually belongs to this user's watchlist before deleting
    //otherwise any logged-in user could delete any item by guessing an id
    const item = await prisma.watchlistItem.findUnique({
        where: { id: itemId },
        include: { watchlist: true },
    });

    if (!item || item.watchlist.userId !== userId) {
        return res.status(404).json({ error: "Watchlist item not found" });
    }

    await prisma.watchlistItem.delete({ where: { id: itemId}});

    return res.status(200).json({ message: "Removed from watchlist" });
}