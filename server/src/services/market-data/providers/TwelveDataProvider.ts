import type {
    MarketDataProvider,
    StockSymbol,
    Quote,
    IntradaySeries,
    HistoricalDailySeries,
    Candle,
    Resolution,
    SymbolSearchResult,
    Exchange
} from "../types";
import { SymbolNotSupportedError, ProviderUnavailableError } from "../Errors";

const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";

/** Maps our resolution strings to Twelve Data's interval format */
function toTwelveDataInterval(resolution: Resolution): string {
    const map: Record<Resolution, string> = {
        "1": "1min",
        "5": "5min",
        "15": "15min",
        "30": "30min",
        "60": "1h",
        D: "1day",
    };
    return map[resolution];
}

interface TwelveDataValue {
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
}

export class TwelveDataProvider implements MarketDataProvider {
    readonly name = "twelvedata";
    //free plan covers US equities only
    readonly supportedExchanges: Exchange[] = ["NYSE"];

    constructor(private readonly apiKey: string) {
        if (!apiKey) {
            throw new Error("TwelveDataProvider requires an API key");
        }
    }

    private assertSupportedExchange(symbol: StockSymbol): void {
        if (!this.supportedExchanges.includes(symbol.exchange)) {
            throw new SymbolNotSupportedError(
                `${symbol.ticker} (${symbol.exchange})`,
                this.name
            );
        }
    }

    private async request<T>(path: string): Promise<T> {
        let res: Response;
        try {
            res = await fetch(
                `${TWELVE_DATA_BASE_URL}${path}${path.includes("?") ? "&" : "?"}apikey=${this.apiKey}`
            );
        } catch (err) {
            throw new ProviderUnavailableError(this.name, err);
        }

        //TwelveData often returns HTTP 200 even for errors
        //with the real status embedded in the JSON body, so check both
        if (res.status === 429) {
            throw new ProviderUnavailableError(this.name, "Rate limit exceeded (8/min or 800/day)");
        }
        if (!res.ok) {
            throw new ProviderUnavailableError(this.name, `HTTP ${res.status}`);
        }

        const body = (await res.json()) as any;

        if (body?.status === "error") {
            const message = String(body.message || "Unknown Twelve Data Error");
            if (/not found|invalid symbol/i.test(message)) {
                throw new SymbolNotSupportedError(path, this.name);
            }
            throw new ProviderUnavailableError(this.name, message);
        }
        return body as T;
    }

    /**
     * Twelve data returns newest-first
     * flip to chronological (oldest first) to match 
     * convention the rest of the app (and Finnhub) already uses
     */
    private valuesToCandles(values: TwelveDataValue[]): Candle[] {
        return values
        .map((v) => ({
            timestamp: Math.floor(new Date(v.datetime).getTime() / 1000),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
            volume: parseInt(v.volume, 10),
        }))
        .reverse();
    }

    async getHistoricalDaily(symbol: StockSymbol, fromUnix: number, toUnix: number): Promise<HistoricalDailySeries> {
        this.assertSupportedExchange(symbol);

        const start = new Date(fromUnix * 1000).toISOString().slice(0, 10);
        const end = new Date(toUnix * 1000).toISOString().slice(0, 10);

        const data = await this.request<{ values?: TwelveDataValue[] }>(
            `/time_series?symbol=${symbol.ticker}&intervale=1day&start_date=${start}&end_date=${end}`
        );

        if (!data.values || data.values.length === 0) {
            throw new SymbolNotSupportedError(symbol.ticker, this.name);
        }

        return { symbol, candles: this.valuesToCandles(data.values) };
    }

    async getIntraday(symbol: StockSymbol, resolution: Resolution): Promise<IntradaySeries> {
        this.assertSupportedExchange(symbol);

        const interval = toTwelveDataInterval(resolution);

        const data = await this.request<{ values?: TwelveDataValue[] }>(
            `/time_series?symbol=${symbol.ticker}&interval=${interval}&outputsize=100`
        );

        if (!data.values || data.values.length === 0) {
            throw new SymbolNotSupportedError(symbol.ticker, this.name);
        }

        return { symbol, resolution, candles: this.valuesToCandles(data.values) };
    }

    async getQuote(symbol: StockSymbol): Promise<Quote> {
        this.assertSupportedExchange(symbol);

        const data = await this.request<{
            close: string;
            open: string;
            previous_close: string;
            percent_change: string;
            timestamp: number;
        }>(`/quote?symbol=${symbol.ticker}`);

        return {
            symbol,
            currentPrice: parseFloat(data.close),
            openPrice: parseFloat(data.open),
            previousClose: parseFloat(data.previous_close),
            percentChangeToday: parseFloat(data.percent_change),
            timestamp: data.timestamp,
        };
    }

    /**
     * Finnhub reamins sole provider
     * 
     * TwelveData's search endpoint exists but there's no need to duplicate it here
     * since it's never reached as a fallback
     */
    async searchSymbol(_query: string): Promise<SymbolSearchResult[]> {
        throw new ProviderUnavailableError(
            this.name,
            "Twelve Data Search is unused -- Finnhub handles this"
        );
    }
}