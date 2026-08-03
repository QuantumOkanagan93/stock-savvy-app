export type Exchange = "NYSE" | "TSX";

export interface SearchResult {
    ticker: string;
    companyName: string;
    exchange: Exchange;
}

export type Signal = "BUY" | "HOLD" | "SELL";

export interface Recommendation {
    signal: Signal;
    explanation: string;
}

export interface Quote {
    symbol: { ticker: string; exchange: Exchange};
    currentPrice: number;
    openPrice: number;
    previousClose: number;
    percentChangeToday: number;
    timestamp: number;
}

export interface WatchlistItemEntry {
    id: string;
    ticker: string;
    exchange: Exchange;
    addedAt: string;
}

export interface SearchHistoryEntry {
    id: string;
    ticker: string;
    exchange: Exchange;
    createdAt: string;
}