import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { selectStock } from "../api/stocks";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "../api/watchlist";
import { ApiError } from "../api/client";
import type { Quote, Exchange, Recommendation } from "../types/stock";
import "./StockDetailPage.css";

export default function StockDetailPage() {
  const { exchange, ticker } = useParams<{ exchange: string; ticker: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  // 👇 NEW STATE: Stores the Flip Thresholds sent from the server
  const [flipThresholds, setFlipThresholds] = useState<{
    buyToHold: number | null;
    holdToSell: number | null;
  }>({
    buyToHold: null,
    holdToSell: null,
  });

  // Tracks whether both the stock is on a watchlist, and (once known) its item id
  // need to call the delete endpoint which takes an id rather than a ticker/exchange pair
  const [watchlistItemId, setWatchlistItemId] = useState<string | null>(null);
  const [isWatchlistBusy, setIsWatchlistBusy] = useState(false);

  useEffect(() => {
    if (!ticker || !exchange) return;

    setIsLoading(true);
    setError(null);

    selectStock(ticker, exchange as Exchange)
      .then((res) => {
        setQuote(res.quote);
        setRecommendation(res.recommendation);
      //  setFlipThresholds(res.flipThresholds);
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
      //Silently leave stat as is on failure, the button simply won't have changed
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

            <div className="detail-meta">
              <div className="detail-meta-row">
                <span className="detail-meta-label">Open</span>
                <span className="detail-meta-value numeric">${quote.openPrice.toFixed(2)}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">Previous close</span>
                <span className="detail-meta-value numeric">
                  ${quote.previousClose.toFixed(2)}
                </span>
              </div>
            </div>

            {(flipThresholds.buyToHold !== null || flipThresholds.holdToSell !== null) && (
              <div className="flip-threshold-card">
                <div className="flip-header">
                  <span className="flip-label">🔮 Signal Flip Points</span>
                  <span className="flip-badge">What changes the signal?</span>
                </div>
                <div className="flip-grid">
                  {flipThresholds.buyToHold !== null && (
                    <div className="flip-item">
                      <span className="flip-from">BUY → HOLD</span>
                      <span className="flip-price">${flipThresholds.buyToHold.toFixed(2)}</span>
                      <span className="flip-note">If price drops below this</span>
                    </div>
                  )}
                  {flipThresholds.holdToSell !== null && (
                    <div className="flip-item">
                      <span className="flip-from">HOLD → SELL</span>
                      <span className="flip-price">${flipThresholds.holdToSell.toFixed(2)}</span>
                      <span className="flip-note">If price drops below this</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="detail-placeholder-note">
              Chart comes next.
            </p>

            { recommendation && (
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
                <p className="recommendation-disclaimer">
                  This is an educational analytics tool, NOT financial advice.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}