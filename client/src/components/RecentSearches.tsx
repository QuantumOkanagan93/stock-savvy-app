import { useEffect, useState } from "react";
import { getSearchHistory } from "../api/stocks";
import type { SearchHistoryEntry, Exchange } from "../types/stocks";
import "./RecentSearches.css";

interface RecentSearchProps {
    onSelect: (ticker: string, exchange: Exchange) => void;
    refreshKey: number;   //bump this after a new selection to refresh
}

export default function RecentSearches({ onSelect, refreshKey }: RecentSearchProps) {
    
}