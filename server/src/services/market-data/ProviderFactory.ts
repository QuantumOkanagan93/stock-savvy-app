import type {
  MarketDataProvider,
  StockSymbol,
  Quote,
  IntradaySeries,
  HistoricalDailySeries,
  Resolution,
  SymbolSearchResult,
  Exchange,
} from "./types.js";
import { SymbolNotSupportedError, ProviderUnavailableError } from "./Errors.js";
import { FinnhubProvider } from "./providers/FinnhubProvider.js";
import { TwelveDataProvider } from "./providers/TwelveDataProvider.js";
import { cache } from "react";
import { fa } from "zod/locales";

/**
 * Wraps a primary provider with an optional secondary fallback.
 * If the primary throws SymbolNotSupportedError or
 * ProviderUnavailableError (e.g. Finnhub's free tier rejecting a
 * TSX symbol or a candle request), the fallback is tried instead.
 */
export class CompositeMarketDataProvider implements MarketDataProvider {
  readonly name: string;
  readonly supportedExchanges: Exchange[];

  constructor(
    private readonly primary: MarketDataProvider,
    private readonly fallback?: MarketDataProvider
  ) {
    this.name = fallback
      ? `${primary.name}+${fallback.name}`
      : primary.name;
    this.supportedExchanges = Array.from(
      new Set([
        ...primary.supportedExchanges,
        ...(fallback?.supportedExchanges ?? []),
      ])
    );
  }

  private async withFallback<T>(
    call: (provider: MarketDataProvider) => Promise<T>
  ): Promise<T> {
    try {
      return await call(this.primary);
    } catch (err) {
      const canFallBack =
        this.fallback &&
        (err instanceof SymbolNotSupportedError ||
          err instanceof ProviderUnavailableError);

      if (!canFallBack) throw err;

      console.warn(
        `[market-data] ${this.primary.name} failed (${
          (err as Error).message
        }), falling back to ${this.fallback!.name}`
      );
      return call(this.fallback!);
    }
  }

  getQuote(symbol: StockSymbol): Promise<Quote> {
    return this.withFallback((p) => p.getQuote(symbol));
  }

  getIntraday(
    symbol: StockSymbol,
    resolution: Resolution
  ): Promise<IntradaySeries> {
    return this.withFallback((p) => p.getIntraday(symbol, resolution));
  }

  getHistoricalDaily(
    symbol: StockSymbol,
    fromUnix: number,
    toUnix: number
  ): Promise<HistoricalDailySeries> {
    return this.withFallback((p) =>
      p.getHistoricalDaily(symbol, fromUnix, toUnix)
    );
  }

  searchSymbol(query: string): Promise<SymbolSearchResult[]> {
    return this.withFallback((p) => p.searchSymbol(query));
  }
}

let cachedProvider: MarketDataProvider | null = null;

/**
 * Single entry point the rest of the app uses:
 *
 *   import { getMarketDataProvider } from "./market-data/providerFactory";
 *   const provider = getMarketDataProvider();
 *   const quote = await provider.getQuote({ ticker: "AAPL", exchange: "NYSE" });
 *
 * To add a fallback provider later (e.g. Twelve Data for TSX candles),
 * this is the only file that changes.
 */
export function getMarketDataProvider(): MarketDataProvider {
  if (cachedProvider) return cachedProvider;

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    throw new Error("FINNHUB_API_KEY environment variable is not set");
  }

  const primary = new FinnhubProvider(finnhubKey);

  /**
   * Finnhub's free tier can't return candle data at all...
   * Twelve data's basic plan fills the gapfor US equities
   */
  const twelveDataKey = process.env.TWELVE_DATA_API_KEY;

  const fallback = twelveDataKey ? new TwelveDataProvider(twelveDataKey) : undefined;
  cachedProvider = new CompositeMarketDataProvider(primary, fallback);
  return cachedProvider;

  // Uncomment once/if a second provider is needed:
  // const fallback = new TwelveDataProvider(process.env.TWELVE_DATA_API_KEY!);
  // cachedProvider = new CompositeMarketDataProvider(primary, fallback);

}