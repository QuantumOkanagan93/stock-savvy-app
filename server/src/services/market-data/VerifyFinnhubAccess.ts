/**
 * Run this once, manually before building anything else:
 * 
 * FINNHUB_API_KEY = xxxxx npx tsx VerifyFinnhubAccess.ts
 * 
 * This tells you for YOUR actual key/plan whether quotes, candles (intraday + historical), and TSX symbols work
 * 
 * 
 */

const API_KEY = process.env.FINNHUB_API_KEY;

if (!API_KEY) {
    console.error("Set FINNHUB_API_KEY env var first");
    process.exit(1);
}

const BASE = "https://finnhub.io/api/v1";

async function check(label: string, path: string) {
    const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}token=${API_KEY}`;

    try {
        const res = await fetch(url);
        const body = await res.json();
        const ok = res.ok && !("error" in body);
        console.log(`[${ok ? "OK " : "FAIL"}] ${label} (HTTP ${res.status})`);
        if (!ok) console.log(`         ->${JSON.stringify(body)}`);
        return ok;
    } catch (err) {
        console.log(`[FAIL] ${label} -> ${String(err)}`);
        return false;
    }
}

async function main() {
    console.log("Checking Finnhub access for your key...\n");

    await check("Quote - NYSE (AAPL)", "/quote?symbol=AAPL");
    await check("Quote - TSX (RY.TO)", "/quote?symbol=RY.TO");

    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - 7 * 24 * 60 * 60;

    await check(
        "Historical daily candle - NYSE (AAPL)",
        `/stock/candle?symbol=AAPL&resolution=D&from=${oneWeekAgo}&to=${now}`
    );

    await check(
        "Historical daily candle - TSX (RY.TO)",
        `/stock/candle?symbol=RY.TO&resolution=D&from=${oneWeekAgo}&to=${now}`
    );

    await check(
        "Intraday candle - NYSE (AAPL, 5 min)",
        `/stock/candle?symbol=AAPL&resolution=5&from=${now - 3600}&to=${now}`
    );

    await check("Symbol search (apple)", "/search?q=apple");
    await check("Symbol search (royal bank)", "/search?q=royal+bank");

    console.log(
        "\nIf any candle checks failed: your plan can't power the chart or\n" +
        "recommendation engine via Finnhub. You'll need either a paid Finnhub\n" + 
        "tier, or a second provider (e.g. Twelve Data's free tier, which\n" +
        "does include historical daily candles) plugged in for candle data\n" +
        "specifically -- the provider factory below is built to make that\n" +
        "swap painless."
    );
}

main();