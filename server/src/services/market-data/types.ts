/**
 * Core types for the market-data abstraction layer
 * No code outside this (and the provider implementations)
 * should know which vendor is behind these calls
 */

export type Exchange = "NYSE" | "TSX";

/**
 * Symbol shape used everywhere in the app.
 * Providers translate to/from their own symbol formats internally
 * 
 * Examples:
 * { ticker: "AAPL", exchange: "NYSE"},
 * { ticker: "RY", exchange: "TSX" }
 * 
 * NOTE: Not "RY.TO", that's a Finnhub-specific detail
 * 
 */

export interface StockSymbol {
    ticker: string;
    exchange: Exchange;
}

export interface Quote {
    symbol: StockSymbol;
    currentPrice: number;
    openPrice: number;
    previousClose: number;
    percentChangeToday: number;
    timestamp: number;   //UNIX seconds
}

export interface Candle {
    timestamp: number;  //UNIX seconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}


export type Resolution = "1" | "5" | "15" | "30" | "60" | "D";

export interface IntradaySeries {
    symbol: StockSymbol;
    resolution: Resolution;
    candles: Candle[];
}

export interface HistoricalDailySeries {
    symbol: StockSymbol;
    candles: Candle[];   //one per trading day
}

export interface SymbolSearchResult {
    ticker: string;
    companyName: string;
    exchange: Exchange;
}

/**
 * The contract every market data provider must implement
 * Controllers/services depend on THIS, never a concrete provider
 */

export interface MarketDataProvider {
    /**Human readable name, used in logs/errors (e.g. finnhub) */
    readonly name: string;

    /**Which exchanges this provider can serve */
    readonly supportedExchanges: Exchange[];

    getQuote(symbol: StockSymbol): Promise<Quote>;

    getIntraday(
        symbol: StockSymbol,
        resolution: Resolution
    ): Promise<IntradaySeries>;

    getHistoricalDaily(
        symbol: StockSymbol,
        fromUnix: number,
        toUnix: number
    ): Promise<HistoricalDailySeries>;

    searchSymbol(query: string): Promise<SymbolSearchResult[]>;
}