import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { selectStock } from "../api/stocks";
import { ApiError } from "../api/client";
import type { Quote, Exchange } from "../types/stock";
import "./StockDetailPage.css";

export default function StockDetailPage() {
  const { exchange, ticker } = useParams<{ exchange: string; ticker: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker || !exchange) return;

    setIsLoading(true);
    setError(null);

    selectStock(ticker, exchange as Exchange)
      .then((res) => setQuote(res.quote))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong loading this stock.");
      })
      .finally(() => setIsLoading(false));
  }, [ticker, exchange]);

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

            <p className="detail-placeholder-note">
              Chart and Buy/Hold/Sell recommendation come next — this
              confirms the quote pipeline works end to end.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}