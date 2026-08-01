import { useEffect, useRef, useState } from "react";
import { searchStocks } from "../api/stocks";
import { ApiError } from "../api/client";
import type { SearchResult, Exchange } from "../types/stock";
import "./SearchBar.css";

interface SearchBarProps {
    onSelect: (ticker: string, exchange: Exchange) => void;
}

const DEBOUNCE_MS = 350;

export default function SearchBar({ onSelect }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const trimmed = query.trim();
        if (trimmed.length === 0) {
            setResults([]);
            setIsOpen(false);
            setError(null);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await searchStocks(trimmed);
                setResults(res.results);
                setIsOpen(true);
            } catch (err) {
                setError (err instanceof ApiError ? err.message : "Search failed. Please try again.");
                setResults([]);
                setIsOpen(true);
            } finally {
                setIsLoading(false);
            }
        }, DEBOUNCE_MS);
        
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    function handleSelect(result: SearchResult) {
        setIsOpen(false);
        setQuery("");
        onSelect(result.ticker, result.exchange);
    }

    return (
        <div className="search-bar">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setIsOpen(true)}
                placeholder="Search by ticker or company name"
                className="search-input"
            />

            { isOpen && (
                <div className="search-dropdown">
                    {isLoading && <div className="search-statuts">Searching....</div>}
                    {!isLoading && error && <div className="search-status search-error">{error}</div>}
                    {!isLoading && !error && results.length === 0 && (
                        <div className="search-status">No matches found.</div>
                    )}

                    {!isLoading &&
                    !error &&
                    results.map((result) => (
                        <button
                            key={`${result.ticker}-${result.exchange}`}
                            className="search-result-row"
                            onClick={() => handleSelect(result)}
                        >
                            <span className="search-result-ticker numeric">{result.ticker}</span>
                            <span className="search-result-name">{result.companyName}</span>
                            <span className="search-result-exchange">{result.exchange}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}