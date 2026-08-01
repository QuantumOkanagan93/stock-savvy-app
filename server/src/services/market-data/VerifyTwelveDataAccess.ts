/**
 * Run this once, manually before relying on Twelve Data for Candle Data
 * 
 * TWELVE_DATA_API_KEY = xxx npx tsx verifyTwelveDataAccess.ts
 */

const API_KEY = process.env.TWELVE_DATA_API_KEY;

if (!API_KEY) {
    console.error("Set TWELVE_DAT_API_KEY env var first");
    process.exit(1);
}

const BASE = "https://api.twelvedata.com";

async function check(label: string, path: string) {
    const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}apikey=${API_KEY}`;
    try {
        const res = await fetch(url);
        const body = await res.json();
        const ok = res.ok && body?.status !== "error";
        console.log(`[${ok ? "OK " : "FAIL"}] ${label} (HTTP ${res.status})`);
        if (!ok) console.log(`     ->${JSON.stringify(body)}`);
        return ok;
    } catch (err) {
        console.log(`[FAIL] ${label} -> ${String(err)}`);
        return false;
    }
}

async function main() {
    console.log("Checking Twelve Data Access for your key...\n");

    await check("Quote (AAPL)", "/quote?symbol=AAPL");
    await check(
        "Historical daily bars (AAPL, last 7 days)",
        "/time_series?symbol=AAPL&interval=1day&outputsize=7"
    );
    await check(
        "Intraday bars (AAPL, 5min)",
        "/time_series?symbol=AAPL&interval=5min&outputsize=20"
    );

    console.log(
        "\nIf all three passed, twelve data is ready as your candle-data\n" + 
        "fallback. Add TWELVE_DATA_API_KEY to server/.env and the provider\n" +
        "factory will pick it up automatically" +
        "Remember, the free tier is capped at 8 calls/min and 800/day -- fine for solo development\n" +
        "worth revisiting if the app ever gets real concurrent users."
    );
}

main();