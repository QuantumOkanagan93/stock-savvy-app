import { apiRequest } from "./client";
import { WatchlistItemEntry, type Exchange } from "../types/stock";

export function getWatchlist() {
    return apiRequest<{ items: WatchlistItemEntry[] }>("/api/watchlist");
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