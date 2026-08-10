import { useEffect, useState } from "react";
import { getWatchlistWithData } from "../api/watchlist";
import type { WatchlistItemWithData } from "../api/watchlist";
import "./WatchlistSection.css";

export default function WatchlistSection() {
  const [items, setItems] = useState<WatchlistItemWithData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWatchlist() {
      try {
        setIsLoading(true);
        const res = await getWatchlistWithData();
        
        // SORT LOGIC: BUY first, then HOLD, then SELL
        const sortedItems = res.items.sort((a, b) => {
          const signalA = a.recommendation?.signal || "HOLD";
          const signalB = b.recommendation?.signal || "HOLD";

          const priority: Record<string, number> = { BUY: 1, HOLD: 2, SELL: 3 };
          return (priority[signalA] || 2) - (priority[signalB] || 2);
        });

        setItems(sortedItems);
      } catch (error) {
        console.error("Failed to load watchlist", error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadWatchlist();
  }, []);

  if (isLoading) {
    return <div className="watchlist-loading">Loading watchlist...</div>;
  }

  if (items.length === 0) {
    return <div className="watchlist-empty">No stocks in your watchlist yet.</div>;
  }

  return (
    <div className="watchlist-section">
      <div className="watchlist-header">
        <h3 className="watchlist-title">📊 Your Watchlist</h3>
        <span className="watchlist-count">{items.length} stocks</span>
      </div>

      <div className="watchlist-grid">
        {items.map((item) => (
          <div key={item.id} className="watchlist-item">
            <div className="watchlist-left">
              <span className="watchlist-ticker">{item.ticker}</span>
              <span className="watchlist-exchange">{item.exchange}</span>
            </div>

            <div className="watchlist-right">
              <span className="watchlist-price">
                ${item.currentPrice?.toFixed(2) || "—"}
              </span>

              <span
                className={`watchlist-badge signal-${item.recommendation?.signal?.toLowerCase() || "hold"}`}
              >
                {item.recommendation?.signal || "HOLD"}
              </span>

              <span className="watchlist-confidence">
                {item.recommendation?.confidence || 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}