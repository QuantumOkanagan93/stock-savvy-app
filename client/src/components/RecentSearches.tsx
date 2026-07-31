import { useEffect, useState } from "react";
import { getSearchHistory } from "../api/stocks";
import type { SearchHistoryEntry, Exchange } from "../types/stocks";
import "./RecentSearches.css";

interface RecentSearchProps {
    onSelect: (ticker: string, exchange: Exchange) => void;
    refreshKey: number;   //bump this after a new selection to refresh
}

export default function RecentSearches({ onSelect, refreshKey }: RecentSearchProps) {
    const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getSearchHistory()
        .then((res) => setHistory(res.history))
        .catch(() => setHistory([]))
        .finally(() => setIsLoading(false))
    }, [refreshKey]);

    if (isLoading) return null;
    if (history.length === 0) return null;

    return (
        <div className="recent-searches">
            <h2 className="recent-searches-title">Recent Searches</h2>
            <div className="recent-searches-list">
                {history.map((entry) => (
                    <button
                        key={entry.id}
                        className="recent-search-row"
                        onClick={() => onSelect(entry.ticker, entry.exchange)}
                    >
                        <span className="recent-search-ticker numeric">{entry.ticker}</span>
                        <span className="recent-search-ticker-exchange">{entry.exchange}</span>
                        <span className="recent-search-time">
                            {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}