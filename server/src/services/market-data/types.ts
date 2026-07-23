/**
 * Typed errors lets calling code (e.g. as an express route) decide what to show the user
 * "invalid ticker" vs "data temporarily unavailable"
 * without string matching on error messages
 */

export class MarketDataError extends Error {
    constructor(message: string, public readonly provider: string) {
        super(message);
        this.name = "MarketDataError";
    }
}


/**
 * Thrown when a provider genuinely doesn't support requested exchange or symbol
 */

export class SymbolNotSupportedError extends MarketDataError {
    constructor(symbol: string, provider: string) {
        super(`Symbol "${symbol}" is not supported by provider "${provider}"`, provider);
        this.name = "SymbolNotSupportedError";
    }
}


/**
 * Thrown for rate limits, timeouts, 5xx responses, network errors, etc.
 * anything transient where a retry or fallback makes sense
 */

export class ProviderUnvailableError extends MarketDataError {
    constructor(provider: string, cause?: unknown) {
        super(
            `Provider "${provider} is temporarily unavailable${cause ? `: ${String(cause)}` : ""
            }`,
            provider
        );
        this.name = "ProviderUnavailableError";
    }
}

/**
 * Thrown when no configured provider can handle this exchange at all
 * (config problem, not a runtime one)
 */

export class NoProviderForExchangeError extends MarketDataError {
    constructor(exchange: string) {
        super(`No market data provider is configured for exchange "${exchange}"`, "factory");
        this.name = "NoProviderForExchangeError";
    }
}
