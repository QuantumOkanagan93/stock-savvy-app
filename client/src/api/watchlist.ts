import { apiRequest } from "./client";
import { type WatchlistItemEntry, type Exchange } from "../types/stock";

export interface WatchlistItemWithData extends WatchlistItemEntry {
    currentPrice?: number | null;
    recommendation?: {
        signal: "BUY" | "HOLD" | "SELL";
        confidence: number;
        score: number;
        explanation: string;
        reasons: string[];
        warnings: string[];
        indicators: any;
    } | null;
}

export function getWatchlist() {
    return apiRequest<{ items: WatchlistItemEntry[] }>("/api/watchlist");
}

//Fetch watchlist with live quotes and recommendations
export function getWatchlistWithData() {
    return apiRequest<{ items: WatchlistItemWithData[] }>("/api/watchlist/with-data");
}

export function addToWatchlist(ticker: string, exchange: Exchange) {
    return apiRequest<{ item: WatchlistItemEntry }>("/api/watchlist", {
        method: "POST",
        body: { ticker, exchange},
    });
}

export function removeFromWatchlist(itemId: string) {
    return apiRequest<{ message: string }>(`/api/watchlist/${itemId}`, {
        method: "DELETE",
    });
}