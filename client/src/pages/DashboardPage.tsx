import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "../components/SearchBar";
import RecentSearches from "../components/RecentSearches";
import WatchlistSection from "../components/WatchlistSection";
import type { Exchange } from "../types/stock";
import "./DashboardPage.css";

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    function handleSelectStock(ticker: string, exchange: Exchange) {
        navigate(`/stock/${exchange}/${ticker}`);
        //Bump the key so Recent Searches refetches next time this page is shown
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
                <h1 className="dashboard-title">{getGreeting()}, {/*{user?.email}*/}</h1>
                {/*}
                <p className="dashboard-note">
                    Search and watchlist go here next - this page confirms
                    your session is live end to end.
                </p>
                */}
                <div
                    className="dashboard-glossary-link"
                    style={{
                        marginBottom: "20px"
                    }}>
                        <Link
                            to="/glossary"
                            className="glossary-nav-link"
                            style = {{
                                color: "#4A90E2",
                                textDecoration: "underline",
                                fontWeight: "500"
                            }}>
                                How our BUY / SELL / HOLD signals work (Technical Glossary)
                            </Link>
                    </div>
                <SearchBar onSelect={handleSelectStock} />

                <WatchlistSection />

                <RecentSearches onSelect={handleSelectStock} refreshKey={historyRefreshKey} />
            </main>
        </div>
    );
}