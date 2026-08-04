import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWatchlist, removeFromWatchlist } from "../api/watchlist";
import type { WatchlistItemEntry } from "../types/stock";
import "./WatchlistSection.css";


export default function WatchlistSection() {
    const [items, setItems] = useState<WatchlistItemEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        getWatchlist()
            .then((res) => setItems(res.items))
            .catch(() => setItems([]))
            .finally(() => setIsLoading(false));
    }, []);

    async function handleRemove(itemId: string, e: React.MouseEvent) {
        e.stopPropagation();   //don't trigger row's navigate-to-detail click
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        try {
            await removeFromWatchlist(itemId);
        } catch {
            //If failed, refresh to restore the true state rather than leave the UI showing something
            //that didn't happen
            getWatchlist().then((res) => setItems(res.items));
        }
    }

    if (isLoading) return null;

    return (
        <div className="watchlist-section">
            <h2 className="watchlist-title">Watchlist</h2>

            {items.length === 0 ? (
                <p className="watchlist-empty">
                    Nothing here yet - open a stock and add it to your watchlist.
                </p>
            ) : (
                <div className="watchlist-list">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="watchlist-row"
                            onClick={() => navigate(`/stock/${item.exchange}/${item.ticker}`)}
                        >
                            <span className="watchlist-ticker numeric">{item.ticker}</span>
                            <span className="watchlist-exchange">{item.exchange}</span>
                            <button
                                className="watchlist-remove"
                                onClick={(e) => handleRemove(item.id, e)}
                                aria-label={`Remove${item.ticker} from watchlist`}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}