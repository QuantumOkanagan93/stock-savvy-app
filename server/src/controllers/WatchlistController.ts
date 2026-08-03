import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

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