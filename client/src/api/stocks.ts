import { apiRequest } from "./client";
import type { SearchResult, Quote, Recommendation, SearchHistoryEntry, Exchange, StockDetailResponse } from "../types/stock";


export function searchStocks(query: string) {
    return apiRequest<{ results: SearchResult[]}>(
        `/api/stocks/search?q=${encodeURIComponent(query)}`
    );
}

/**
 * 

export function selectStock(ticker: string, exchange: Exchange) {
    return apiRequest<{ quote: Quote; recommendation: Recommendation}>("/api/stocks/select", {
        method: "POST",
        body: { ticker, exchange }
    });
}
*/

/* Above uses old object, below uses new StockDetailResponse to add on the flipThreshold logic*/
export function selectStock(ticker: string, exchange: Exchange) {
    return apiRequest<StockDetailResponse>("/api/stocks/select", {
        method: "POST",
        body: { ticker, exchange }
    });
}

export function getSearchHistory() {
    return apiRequest<{ history: SearchHistoryEntry[] }>("/api/stocks/history");
}
