import type {
  MarketDataProvider,
  StockSymbol,
  Quote,
  IntradaySeries,
  HistoricalDailySeries,
  Candle,
  Resolution,
  SymbolSearchResult,
  Exchange,
} from "../types.js";
import {
  SymbolNotSupportedError,
  ProviderUnavailableError,
} from "../Errors.js";
import { time } from "node:console";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function toFinnhubSymbol(symbol: StockSymbol): string {
  if (symbol.exchange === "TSX") return `${symbol.ticker}.TO`;
  return symbol.ticker; // NYSE
}

/** Reverses toFinnhubSymbol for parsing search results. */
function fromFinnhubSymbol(raw: string): StockSymbol {
  if (raw.endsWith(".TO")) {
    return { ticker: raw.slice(0, -3), exchange: "TSX" };
  }
  return { ticker: raw, exchange: "NYSE" };
}

export class FinnhubProvider implements MarketDataProvider {
  readonly name = "finnhub";

  readonly supportedExchanges: Exchange[] = ["NYSE"];

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error("FinnhubProvider requires an API key");
    }
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${FINNHUB_BASE_URL}${path}${
      path.includes("?") ? "&" : "?"
    }token=${this.apiKey}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new ProviderUnavailableError(this.name, err);
    }

    if (res.status === 403 || res.status === 429) {
      // 403: not on this plan. 429: rate limited. Both are cases
      // where a fallback provider (if configured) should take over.
      throw new ProviderUnavailableError(
        this.name,
        `HTTP ${res.status} from Finnhub`
      );
    }

    if (!res.ok) {
      throw new ProviderUnavailableError(this.name, `HTTP ${res.status}`);
    }

    const body = (await res.json()) as any;

    if (body && typeof body === "object" && "error" in body) {
      const message = String(body.error);
      if (/not supported/i.test(message)) {
        throw new SymbolNotSupportedError(path, this.name);
      }
      throw new ProviderUnavailableError(this.name, message);
    }

    return body as T;
  }

  private assertSupportedExchange(symbol: StockSymbol): void {
    if (!this.supportedExchanges.includes(symbol.exchange)) {
      throw new SymbolNotSupportedError(
        `${symbol.ticker} (${symbol.exchange})`,
        this.name
      );
    }
  }

  async getQuote(symbol: StockSymbol): Promise<Quote> {
    this.assertSupportedExchange(symbol);
    const finnhubSymbol = toFinnhubSymbol(symbol);
    const data = await this.request<{
      c: number; // current price
      o: number; // open
      pc: number; // previous close
      dp: number; // percent change
      t: number; // timestamp
    }>(`/quote?symbol=${encodeURIComponent(finnhubSymbol)}`);

    // Finnhub returns all-zero fields for symbols it silently doesn't
    // recognize (rather than an error) -- treat that as unsupported.
    if (data.c === 0 && data.o === 0 && data.pc === 0) {
      throw new SymbolNotSupportedError(finnhubSymbol, this.name);
    }

    return {
      symbol,
      currentPrice: data.c,
      openPrice: data.o,
      previousClose: data.pc,
      percentChangeToday: data.dp,
      timestamp: data.t,
    };
  }

  async getIntraday(
    symbol: StockSymbol,
    resolution: Resolution
  ): Promise<IntradaySeries> {
    this.assertSupportedExchange(symbol);
    const finnhubSymbol = toFinnhubSymbol(symbol);
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = now - 24 * 60 * 60; // last 24h as "today" window

    const data = await this.request<{
      s: string; // status: "ok" | "no_data"
      t: number[];
      o: number[];
      h: number[];
      l: number[];
      c: number[];
      v: number[];
    }>(
      `/stock/candle?symbol=${encodeURIComponent(
        finnhubSymbol
      )}&resolution=${resolution}&from=${startOfDay}&to=${now}`
    );

    if (data.s !== "ok") {
      throw new SymbolNotSupportedError(finnhubSymbol, this.name);
    }

    return {
      symbol,
      resolution,
      candles: zipCandles(data),
    };
  }

  async getHistoricalDaily(
    symbol: StockSymbol,
    fromUnix: number,
    toUnix: number
  ): Promise<HistoricalDailySeries> {
    this.assertSupportedExchange(symbol);
    const finnhubSymbol = toFinnhubSymbol(symbol);

    const data = await this.request<{
      s: string;
      t: number[];
      o: number[];
      h: number[];
      l: number[];
      c: number[];
      v: number[];
    }>(
      `/stock/candle?symbol=${encodeURIComponent(
        finnhubSymbol
      )}&resolution=D&from=${fromUnix}&to=${toUnix}`
    );

    if (data.s !== "ok") {
      throw new SymbolNotSupportedError(finnhubSymbol, this.name);
    }

    return { symbol, candles: zipCandles(data) };
  }

  async searchSymbol(query: string): Promise<SymbolSearchResult[]> {
    const data = await this.request<{
      result: Array<{ symbol: string; description: string; type: string }>;
    }>(`/search?q=${encodeURIComponent(query)}`);

    return data.result
      .filter((r) => r.type === "Common Stock")
      .map((r) => {
        const { ticker, exchange } = fromFinnhubSymbol(r.symbol);
        return { ticker, companyName: r.description, exchange };
      })
      .filter((r) => this.supportedExchanges.includes(r.exchange));
  }
}

function zipCandles(data: {
    t:number[];
    o: number[];
    h: number[];
    l: number[];
    c: number[];
    v: number[];
}): Candle[] {
    const candles: Candle[] = [];

    for (let i = 0; i < data.t.length; i++) {
        const timestamp = data.t[i];
        const open = data.o[i];
        const high = data.h[i];
        const low = data.l[i];
        const close = data.c[i];
        const volume = data.v[i];

        //Protection against returning ragged arrays for this index
        if(
            timestamp === undefined ||
            open === undefined ||
            high === undefined ||
            low === undefined ||
            close === undefined ||
            volume === undefined
        ) {
            console.warn(
                `[finnhub] Skipping malformed candle at index ${i}: one or more fields missing`
            );
            continue;
        }
        candles.push({ timestamp, open, high, low, close, volume });
    }
    return candles;
}