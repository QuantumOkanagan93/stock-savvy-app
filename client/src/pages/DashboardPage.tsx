import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "../components/SearchBar";
import RecentSearches from "../components/RecentSearches";
import type { Exchange } from "../types/stocks";
import "./DashboardPage.css";

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    function handleSelectStock(ticker: string, exchange: Exchange) {
        navigate(`/stock/${exchange}/${ticker}`);
        //Bump th ekey so Recent Searches refetches next time this page is shown
        setHistoryRefreshKey((k) => k + 1);
    }

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <span className="dashboard-eyebrow">Stock Savvy</span>
                <button className="dashboard-logout" onClick={() => logout()}>
                    Log Out
                </button>
            </header>

            <main className="dashboard-main">
                <h1 className="dashboard-title">Good to see you, {user?.email}</h1>
                {/*}
                <p className="dashboard-note">
                    Search and watchlist go here next - this page confirms
                    your session is live end to end.
                </p>
                */}
                <SearchBar onSelect={handleSelectStock} />

                <RecentSearches onSelect={handleSelectStock} refreshKey={historyRefreshKey} />
            </main>
        </div>
    );
}