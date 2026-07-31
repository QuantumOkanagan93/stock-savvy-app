import { apiRequest } from "./client";
import type { SearchResult, Quote, SearchHistoryEntry, Exchange } from "../types/stocks";


export function searchStocks(query: string) {
    return apiRequest<{ results: SearchResult[]}>(
        `/api/stocks/search?q=${encodeURIComponent(query)}`
    );
}

export function selectStock(ticker: string, exchange: Exchange) {
    return apiRequest<{ quote: Quote}>("/api/stocks/select", {
        method: "POST",
        body: { ticker, exchange }
    });
}

export function getSearchHistory() {
    return apiRequest<{ history: SearchHistoryEntry[] }>("/api/stocks/history");
}