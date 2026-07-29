import { useAuth } from "../context/AuthContext";
import "./DashboardPage.css";

export default function DashboardPage() {
    const { user, logout } = useAuth();

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
                <p className="dashboard-note">
                    Search and watchlist go here next - this page confirms
                    your session is live end to end.
                </p>
            </main>
        </div>
    );
}