export type Exchange = "NYSE" | "TSX";

export interface SearchResult {
    ticker: string;
    companyName: string;
    exchange: Exchange;
}

export type Signal = "BUY" | "HOLD" | "SELL";

export interface IndicatorSnapshot {
    rsi14: number;
    ema20: number;
    bbUpper: number;
    bbLower: number;
    bbMiddle: number;
    bbPosition: number;
    atr14: number;
    volumeRatio: number;
    momentum5dPercent: number;
}

export interface Recommendation {
    signal: Signal;
    confidence: number;
    score: number;
    explanation: string;
    reasons: string[];
    warnings: string[];
    indicators: IndicatorSnapshot | null;
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