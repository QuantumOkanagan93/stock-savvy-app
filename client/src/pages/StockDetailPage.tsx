import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { selectStock } from "../api/stocks";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "../api/watchlist";
import { ApiError } from "../api/client";
import type { Quote, Exchange, Recommendation } from "../types/stock";
import StockChart from "../components/StockChart";
import "./StockDetailPage.css";

export default function StockDetailPage() {
  const { exchange, ticker } = useParams<{ exchange: string; ticker: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [candles, setCandles] = useState<any[]>([]);

  const [flipThresholds, setFlipThresholds] = useState<{
    buyToHold: number | null;
    holdToSell: number | null;
  }>({
    buyToHold: null,
    holdToSell: null,
  });

  const [watchlistItemId, setWatchlistItemId] = useState<string | null>(null);
  const [isWatchlistBusy, setIsWatchlistBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<"overview" | "signal" | "details">("overview");

  useEffect(() => {
    if (!ticker || !exchange) return;

    setIsLoading(true);
    setError(null);

    selectStock(ticker, exchange as Exchange)
      .then((res) => {
        setQuote(res.quote);
        setRecommendation(res.recommendation);
        setFlipThresholds(res.flipThresholds);
        setCandles(res.candles || []);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong loading this stock.");
      })
      .finally(() => setIsLoading(false));

      getWatchlist()
        .then((res) => {
          const match = res.items.find(
            (item) => item.ticker === ticker && item.exchange === exchange
          );
          setWatchlistItemId(match ? match.id : null);
        })
        .catch(() => setWatchlistItemId(null));
  }, [ticker, exchange]);

  async function handleToggleWatchlist() {
    if (!ticker || !exchange) return;
    setIsWatchlistBusy(true);

    try {
      if (watchlistItemId) {
        await removeFromWatchlist(watchlistItemId);
        setWatchlistItemId(null);
      } else {
        const res = await addToWatchlist(ticker, exchange as Exchange);
        setWatchlistItemId(res.item.id);
      }
    } catch {
    } finally {
      setIsWatchlistBusy(false);
    }
  }

  const isPositive = quote ? quote.percentChangeToday >= 0 : null;

  return (
    <div className="detail-page">
      <header className="detail-header">
        <button className="detail-back" onClick={() => navigate("/")}>
          ← Back to dashboard
        </button>
      </header>

      <main className="detail-main">
        {isLoading && <p className="detail-status">Loading…</p>}
        {!isLoading && error && <p className="detail-status detail-error">{error}</p>}

        {!isLoading && !error && quote && (
          <div className="detail-card">
            
            <div className="detail-ticker-row">
              <span className="detail-ticker numeric">{quote.symbol.ticker}</span>
              <span className="detail-exchange">{quote.symbol.exchange}</span>
              <button
                className={`watchlist-toggle ${watchlistItemId ? "watchlist-toggle-active" : ""}`}
                onClick={handleToggleWatchlist}
                disabled={isWatchlistBusy}
              >
                {watchlistItemId ? "* On Watchlist" : "Add to watchlist"}
              </button>
            </div>

            <div className="detail-price-row">
              <span className="detail-price numeric">${quote.currentPrice.toFixed(2)}</span>
              <span className={`detail-change numeric ${isPositive ? "positive" : "negative"}`}>
                {isPositive ? "+" : ""}
                {quote.percentChangeToday.toFixed(2)}%
              </span>
            </div>

            <div className="detail-tabs">
              <button 
                className={`detail-tab ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                📊 Overview
              </button>
              <button 
                className={`detail-tab ${activeTab === "signal" ? "active" : ""}`}
                onClick={() => setActiveTab("signal")}
              >
                📈 Signal
              </button>
              <button 
                className={`detail-tab ${activeTab === "details" ? "active" : ""}`}
                onClick={() => setActiveTab("details")}
              >
                🔍 Details
              </button>
            </div>

            <div className="detail-tab-content">
              
              {/* Tab 1: Overview With Chart */}
              {activeTab === "overview" && (
                <div className="detail-meta">
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Open</span>
                    <span className="detail-meta-value numeric">${quote.openPrice.toFixed(2)}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Previous close</span>
                    <span className="detail-meta-value numeric">${quote.previousClose.toFixed(2)}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Day Range</span>
                    <span className="detail-meta-value numeric">
                      ${Math.min(quote.openPrice, quote.currentPrice).toFixed(2)} - ${Math.max(quote.openPrice, quote.currentPrice).toFixed(2)}
                    </span>
                  </div>
                  <StockChart candles={candles} />
                </div>
              )}

              {/* Tab 2: Signal (Recommendation + Flip Thresholds) */}
              {activeTab === "signal" && recommendation && (
                <div className="detail-signal-tab">
                  <div className={`recommendation-card recommendation-${recommendation.signal.toLowerCase()}`}>
                    <div className="recommendation-header">
                      <span className="recommendation-signal">{recommendation.signal}</span>
                      <span className="recommendation-confidence numeric">
                        {recommendation.confidence}% confidence
                      </span>
                    </div>
                    <p className="recommendation-explanation">{recommendation.explanation}</p>

                    {recommendation.reasons.length > 0 && (
                      <ul className="recommendation-reasons">
                        {recommendation.reasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {(flipThresholds.buyToHold !== null || flipThresholds.holdToSell !== null) && (
                    <div className="flip-threshold-card">
                      <div className="flip-header">
                        <span className="flip-label">🔮 Flip Points</span>
                      </div>
                      <div className="flip-grid">
                        {flipThresholds.buyToHold !== null && (
                          <div className="flip-item">
                            <span className="flip-from">BUY → HOLD</span>
                            <span className="flip-price">${flipThresholds.buyToHold.toFixed(2)}</span>
                          </div>
                        )}
                        {flipThresholds.holdToSell !== null && (
                          <div className="flip-item">
                            <span className="flip-from">HOLD → SELL</span>
                            <span className="flip-price">${flipThresholds.holdToSell.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="recommendation-disclaimer" style={{ marginTop: 'var(--space-4)' }}>
                    This is an educational analytics tool, NOT financial advice.
                  </p>
                </div>
              )}

              {/* Tab 3: Details (Raw Indicators) */}
              {activeTab === "details" && recommendation?.indicators && (
                <div className="detail-indicators">
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">RSI (14)</span>
                    <span className="detail-meta-value numeric">{recommendation.indicators.rsi14}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">EMA (20)</span>
                    <span className="detail-meta-value numeric">${recommendation.indicators.ema20.toFixed(2)}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Bollinger Position</span>
                    <span className="detail-meta-value numeric">{recommendation.indicators.bbPosition.toFixed(2)}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Volume Ratio</span>
                    <span className="detail-meta-value numeric">{recommendation.indicators.volumeRatio.toFixed(2)}x</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Momentum (5d)</span>
                    <span className="detail-meta-value numeric">{recommendation.indicators.momentum5dPercent}%</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">ATR (14)</span>
                    <span className="detail-meta-value numeric">${recommendation.indicators.atr14.toFixed(2)}</span>
                  </div>
                </div>
              )}
              
            </div>

          </div>
        )}
      </main>
    </div>
  );
}