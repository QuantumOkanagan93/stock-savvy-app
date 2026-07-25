/**
 * Typed errors let the calling code decide what to show users
 */

export class MarketDataError extends Error {
    constructor(message: string, public readonly provider: string) {
        super(message);
        this.name = "MarketDataError";
    }
}


/**
 * This is thrown when a provider genuinely doesn't support
 * the requested exchange or symbol
 * The provider factory catches this and can fall back to another one if configured
 */
export class SymbolNotSupportedError extends MarketDataError {
    constructor(symbol: string, provider: string) {
        super(`Symbol "${symbol}" is not supported by provider "${provider}"`, provider);
        this.name = "SymbolNotSupportedError";
    }
}

/**
 * Thrown for rate limits, timeouts, 5xx responses, network errors etc.
 */

export class ProviderUnavailableError extends MarketDataError {
    constructor(provider: string, cause?: unknown) {
        super(
            `Provider "${provider}" is temporarily unavailable${
                cause ? `: ${String(cause)}` : ""
            }`,
            provider
        );
        this.name = "ProviderUnavailableError";
    }
}

/**
 * Thrown when no configured provider can handle this exchange at all
 * (configuration problem, not a runtime one)
 */

export class NoProviderExchangeError extends MarketDataError {
    constructor(exchange: string) {
        super(`No market data provider is configured for exchange "${exchange}"`, "factory");
        this.name = "NoProviderForExchangeError";
    }
}