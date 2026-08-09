import { useNavigate } from "react-router-dom";
import "./GlossaryPage.css";

export default function GlossaryPage() {
    const navigate = useNavigate();


    return (
        <div className="glossary-page">
            <header className="glossary-header">
                <button className="glossary-back" onClick={() => navigate("/")}>
                    &larr; Back to Dashboard
                </button>
            </header>

            <main className="glossary-main">
                <h1>How Our Recommendations Work</h1>
                <p className="glossary-intro">
                    Our engine analyzes 5 key technical factors. Each factor gets a score between <strong>-1 and 1</strong>,
                    then they are weighted together to produce the final <strong>BUY, SELL, or HOLD</strong> signal.
                </p>
                <h2 className="glossary-section-title">The Signals</h2>
                <div className="glossary-item">
                    <h3 className="glossary-term signal-buy">BUY</h3>
                    <p>
                        <strong>Trigger:</strong> The composite score is greater than <code>+0.25</code>.
                        The indicators are strongly bullish.
                    </p>
                </div>
                <div className="glossary-item">
                    <h3 className="glossary-term signal-sell">SELL</h3>
                    <p>
                        <strong>Trigger:</strong> The composite score is less than <code>-0.25</code>.
                        The indicators are strongly bearish.
                    </p>
                </div>
                <div className="glossary-item">
                    <h3 className="glossary-term signal-hold">HOLD</h3>
                    <p>
                        <strong>Trigger:</strong> The score is between <code>-0.25</code> and <code>+0.25</code>.
                        Signals are mixed or neutral, so no strong directional edge exists.
                    </p>
                </div>
                <h2 className="glossary-section-title">The 5 Indicators (Weighted)</h2>
                <div className="glossary-item">
                    <h3>1. EMA 20 Trend <span className="weight">(30% weight)</span></h3>
                    <p>
                        <strong>Exponential Moving Average (20-day).</strong> If the price is <em>above</em> the EMA,
                        it scores <code>+1</code>. If below, it scores <code>-1</code>. It checks the medium-term trend direction.
                    </p>
                </div>
                <div className="glossary-item">
                    <h3>2. RSI 14 <span className="weight">(25% Weight)</span></h3>
                    <p>
                        <strong>Relative Strength Index (14-day).</strong> Measures momentum speed and change.
                    </p>
                    <ul>
                        <li><strong>Below 30:</strong> Oversold (bullish, scores <code>+1).</code></li>
                        <li><strong>Above 70:</strong> Overbought (bearish, scores <code>-1).</code></li>
                        <li><strong>30 - 70:</strong> Neutral (scored between <code>+1</code> and <code>-1</code>).</li>
                    </ul>
                </div>
                <div className="glossary-item">
                    <h3>3. Bollinger Bands Position <span className="weight">(20% weight)</span></h3>
                    <p>
                        <strong>20-day bands with 2 standard deviations.</strong> We look at where the price sits inside the bands:
                    </p>
                    <ul>
                        <li><strong>Near Lower Band (pb &lt; 0.1):</strong> Usually a bounce point (bullish, scores <code>+1</code>).</li>
                        <li><strong>Near Upper Band (pb &gt; 0.9):</strong> Usually a resistance point (bearish, scores <code>-1</code>).</li>
                    </ul>
                </div>
                <div className="glossary-item">
                    <h3>4. Volume Ratio <span className="weight">(15% weight)</span></h3>
                    <p>
                        Compares the average volume of the <strong>Last 5 days</strong> to the average of the <strong>15 days prior</strong>
                    </p>
                </div>
            </main>
        </div>
    )
}