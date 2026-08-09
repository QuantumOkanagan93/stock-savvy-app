import { warn } from "node:console";
import { sign } from "node:crypto";
import { RSI, EMA, BollingerBands, ATR } from "technicalindicators";

export type Signal = "BUY" | "HOLD" | "SELL";

export interface OHLCVBar {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface IndicatorSnapshot {
    rsi14: number;
    ema20: number;
    bbUpper: number;
    bbLower: number;
    bbMiddle: number;
    bbPosition: number;
    atr14: number;
    volumeRatio: number;
    momentum5dPercent: number;
}

export interface RecommendationInput {
    currentPrice: number;
    todayPercentChange: number;
    weeklyChangePercent: number;
    fiveDayAverage: number;
}

export interface Recommendation {
    signal: Signal;
    explanation: string;
    confidence: number;   // 0 - 100
    score: number;    // -1 to 1
    reasons: string[];
    warnings: string[];
    indicators: IndicatorSnapshot | null;    //null when data is insufficient
}
/**
 * Old thresholds:
 *
  const WEEKLY_CHANGE_BUY_THRESHOLD = 3;  //in percent
  const WEEKLY_CHANGE_SELL_THRESHOLD = -3;  //in percent

  use these new ones now:
  */
const MIN_BARS_REQUIRED = 30;  //RSI(14)/EMA(20)/BB(20)/ATR(14) all need burn-in room
const SIGNAL_THRESHOLD = 0.25;


function insufficientDataRecommendation(): Recommendation {
    return {
        signal: "HOLD",
        confidence: 50,
        score: 0,
        explanation:
            "Not enough recent trading history is available yet to generate a confident recommendation.",
        reasons: [],
        warnings: [],
        indicators: null,
    };
}

function mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 *  OLD FUNCTION, USE THE ONE BELOW NOW
 * 
 * 
 * Deliberatly simple for MVP: weekly change vs threshold
 * 
 * will change the logic of this after it works to something more complex to analyze
 

export function generateRecommendation(input: RecommendationInput): Recommendation {
    const { currentPrice, todayPercentChange, weeklyChangePercent, fiveDayAverage } = input;

    const priceAboveAvg = currentPrice > fiveDayAverage;
    const priceBelowAvg = currentPrice < fiveDayAverage;

    let signal: Signal;
    if (weeklyChangePercent > WEEKLY_CHANGE_BUY_THRESHOLD && priceAboveAvg) {
        signal = "BUY";
    } else if (weeklyChangePercent < WEEKLY_CHANGE_SELL_THRESHOLD && priceBelowAvg) {
        signal = "SELL";
    } else {
        signal = "HOLD";
    }

    const explanation = buildExplanation(signal, {
        currentPrice,
        todayPercentChange,
        weeklyChangePercent,
        fiveDayAverage,
    });

    return { signal, explanation };
}
*/
export function generateRecommendation(
    candles: OHLCVBar[],
    todayPercentChange: number
): Recommendation {
    if (candles.length < MIN_BARS_REQUIRED) {
        return insufficientDataRecommendation();
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    const lastClose = closes[closes.length - 1];
    if (lastClose === undefined) return insufficientDataRecommendation();

    // Indicator Calculation 
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const rsi = rsiValues[rsiValues.length - 1];

    const emaValues = EMA.calculate({ values: closes, period: 20 });
    const ema20 = emaValues[emaValues.length - 1];

    const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
    const bb = bbValues[bbValues.length - 1];

    const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const atr14 = atrValues[atrValues.length - 1];

    if (rsi === undefined || ema20 === undefined || bb === undefined || bb === undefined || atr14 === undefined) {
        //This shouldn't happen given the var MIN_BARS_REQUIRED, but 
        //the library's return types are honest about possibility
        //so we stay honest about it too rather than asserting non-null
        return insufficientDataRecommendation();
    }

    //Bollinger squeeze edge case
    //if upper === lower, pb is NaN/Infinity. Treat as neutral
    const bbPosition = Number.isFinite(bb.pb) ? bb.pb : 0.5;

    //Volume ratio: Last 5 days vs 15 days before that
    const recentVolumeSlice = volumes.slice(-5);
    const historicalVolumeSlice = volumes.slice(-20, -5);
    const recentVolume = mean(recentVolumeSlice);
    const historicalVolume = historicalVolumeSlice.length > 0 ? mean(historicalVolumeSlice) : 0;
    const volumeRatio = historicalVolume > 0 ? recentVolume / historicalVolume : 1;

    //5-day momentum
    const closeFiveBarsAgo = closes[closes.length - 6];
    const momentum5d =
        closeFiveBarsAgo !== undefined && closeFiveBarsAgo !== 0
            ? lastClose / closeFiveBarsAgo - 1
            : 0;

    //Signal normalization (each in [-1, 1])
    const sEMA = lastClose > ema20 ? 1 : lastClose < ema20 ? -1 : 0;

    let sRSI: number;
    if (rsi < 30) sRSI = 1;
    else if (rsi > 70) sRSI = -1;
    else sRSI = (50 - rsi) / 20;

    let sBB: number;
    if (bbPosition < 0.1) sBB = 1;
    else if (bbPosition > 0.9) sBB = -1;
    else sBB = (0.5 - bbPosition) / 0.4;

    let sVol: number;
    if (volumeRatio > 1.5) sVol = 1;
    else if (volumeRatio > 1.0) sVol = (volumeRatio - 1) / 0.5;
    else sVol = 0;

    let sMom: number;
    if (momentum5d > 0.03) sMom = 1;
    else if (momentum5d < -0.03) sMom = -1;
    else sMom = momentum5d / 0.03;

    //Weighted composite score
    const WEIGHTS = { ema: 0.3, rsi: 0.25, bb: 0.2, vol: 0.15, mom: 0.1 };
    const score =
        sEMA * WEIGHTS.ema +
        sRSI * WEIGHTS.rsi +
        sBB * WEIGHTS.bb +
        sVol * WEIGHTS.vol +
        sMom * WEIGHTS.mom;

    let signal: Signal;
    if (score > SIGNAL_THRESHOLD) signal = "BUY";
    else if (score < -SIGNAL_THRESHOLD) signal = "SELL";
    else signal = "HOLD";

    const confidence = Math.round(Math.min(50 + Math.abs(score) * 50, 95));

    //Reasons (factual readouts, not randomized
    //these are data points, not narrative, so variety doesn't apply the way
    //it does to the main explanation below)
    const reasons: string[] = [];
    reasons.push(
        sEMA > 0
            ? `Price ($${lastClose.toFixed(2)}) is above the 20-day trend line ($${ema20.toFixed(2)})`
            : `Price ($${lastClose.toFixed(2)}) is below the 20-day trend line ($${ema20.toFixed(2)})`
    );

    if (rsi < 30) reasons.push(`RSI shows oversold conditions (${rsi.toFixed(1)})`);
    else if (rsi > 70) reasons.push(`RSI shows overbought conditions (${rsi.toFixed(1)})`);
    else reasons.push(`RSI is neutral (${rsi.toFixed(1)})`);

    if (bbPosition < 0.1) reasons.push("Price is near the lower Bollinger Band");
    else if (bbPosition > 0.9) reasons.push("Price is near the upper Bollinger Band");

    if (volumeRatio > 1.2)
        reasons.push(`Volume is ${volumeRatio.toFixed(1)}x the recent average, indicating a strong interest`);
    if (Math.abs(momentum5d) > 0.01) {
        const dir = momentum5d > 0 ? "+" : "";
        reasons.push(`5-day momentum is ${dir}${(momentum5d * 100).toFixed(1)}`);
    }

    //Counter signal warnings
    const warnings: string[] = [];
    if (signal === "BUY" && sRSI < -0.5) {
        warnings.push("RSI is approaching overbought territory despite the bullish signal");
    }
    if (signal === "SELL" && sRSI > 0.5) {
        warnings.push("RSI is approaching oversold territory despite the bearish signal");
    }
    if (volumeRatio < 0.8) {
        warnings.push("Low volume suggests weak conviction behind the current price action");
    }

    //Added more data for explanation
    const explanation = buildExplanation(
        signal,
        reasons,
        warnings,
        todayPercentChange,
        lastClose,
        rsi,
        ema20,
        volumeRatio,
        momentum5d
    );

    return {
        signal,
        confidence,
        score: Math.round(score * 100) / 100,
        explanation,
        reasons,
        warnings,
        indicators: {
            rsi14: Math.round(rsi * 100) / 100,
            ema20: Math.round(ema20 * 100) / 100,
            bbUpper: Math.round(bb.upper * 100) / 100,
            bbLower: Math.round(bb.lower * 100) / 100,
            bbMiddle: Math.round(bb.middle * 100) / 100,
            bbPosition: Math.round(bbPosition * 1000) / 1000,
            atr14: Math.round(atr14 * 100) / 100,
            volumeRatio: Math.round(volumeRatio * 100) / 100,
            momentum5dPercent: Math.round(momentum5d * 1000) / 10,
        },
    };
}

/**
 * Older function, use new one below
 * 
function buildExplanation(signal: Signal, input: RecommendationInput): string {
    const { currentPrice, todayPercentChange, weeklyChangePercent, fiveDayAverage } = input;

    const weeklyDirection = weeklyChangePercent >= 0 ? "up" : "down";
    const weeklyAbs = Math.abs(weeklyChangePercent).toFixed(1);
    const todayDirection = todayPercentChange >= 0 ? "up" : "down";
    const todayAbs = Math.abs(todayPercentChange).toFixed(1);
    const vsAvg =
        currentPrice > fiveDayAverage
            ? "above its 5-day average"
            : currentPrice < fiveDayAverage
                ? "below its 5-day average"
                : "in line with its 5-day average";

    switch (signal) {
        case "BUY":
            return (
                `Buy -- the stock is ${weeklyAbs}% ${weeklyDirection} over the past week and trading ` +
                `${vsAvg}, suggesting positive short-term momentum. Today it's ${todayAbs}% ${todayDirection}.`
            );
        case "SELL":
            return (
                `Sell -- The stock is ${weeklyAbs}% ${weeklyDirection} over the past week and trading ` +
                `${vsAvg}, suggesting a negative short-term momentum. Today it's ${todayAbs}% ${todayDirection}.`
            );
        case "HOLD":
        default:
            return (
                `Hold -- the stock's weekly movement (${weeklyAbs}% ${weeklyDirection}) and its position ` +
                `${vsAvg} don't show a clear short-term direction. Today it's ${todayAbs}% ${todayDirection}.`
            );
    }
}
*/

function buildExplanation (
    signal: Signal,
    reasons: string[],
    warnings: string[],
    todayPercentageChange: number,
    currentPrice: number,
    rsi: number,
    ema20: number,
    volumeRatio: number,
    momentum5d: number
): string {
    const todayDirection = todayPercentageChange >= 0 ? "Up" : "Down";
    const todayAbs = Math.abs(todayPercentageChange).toFixed(1);
    const priceVsEma = currentPrice > ema20 ? "above" : "below";

    //Pick 2 - 3 random reasons to weave into the narrative
    const shuffledReasons = [...reasons].sort(() => Math.random() - 0.5);
    const selectedReasons = shuffledReasons.slice(0, Math.min(3, reasons.length));
    const firstSelectedReason: string = selectedReasons[0] ?? "";

    //Base templates for signal
    const signalTemplates: Record<Signal, string[]> = {
        BUY: [
            `Buy - ${selectedReasons.join("; ")}.` +
            `Today's ${todayAbs}% ${todayDirection} move confirms the bullish momentum. ` +
            `With RSI at ${rsi.toFixed(1)} and price ${priceVsEma} the 20-day trend ($${ema20.toFixed(2)}), the bulls are in control.`,

            `Buy - The balance of indicators leans bullish. ${firstSelectedReason}. ` +
            `Volume is ${volumeRatio.toFixed(1)}x average, showing institutional interest. ` +
            `Today's ${todayAbs}% ${todayDirection} move adds to the case for an entry.`,

            `Buy - Short term momentum is building. ${selectedReasons.join("; ")}. ` +
            `At $${currentPrice.toFixed(2)}, the stock is gaining traction. ` +
            `If you are considering a position, this is a strong signal to act within the next 1 - 2 days.`,
        ],
        SELL: [
            `Sell - ${selectedReasons.join("; ")}. ` +
            `Today's ${todayAbs}% ${todayDirection} move reinforces the bearish trend. ` +
            `With RSI at ${rsi.toFixed(1)} and price ${priceVsEma} the 20-day trend ($${ema20.toFixed(2)}), the bears are in control.`,

            `Sell - the balance of indicators leans bearish. ${firstSelectedReason}. ` +
            `Momentum is fading, and volume is ${volumeRatio.toFixed(1)}x average. ` + 
            `If you're holding, consider taking profits or tighenting your stop-loss.`,

            `Sell - Downward pressure is mounting. ${selectedReasons.join("; ")}. ` +
            `At $${currentPrice.toFixed(2)}, the stock is losing support. ` +
            `This is a strong signal to exit or short, with caution for a potential bounce.`,
        ],
        HOLD: [
            `Hold - Signals are mixed. ${selectedReasons.join("; ")}. ` +
            `Today's ${todayAbs}% ${todayDirection} move doesn't change the picture. ` +
            `With RSI at ${rsi.toFixed(1)} and volume at ${volumeRatio.toFixed(1)}x average, there's no clear edge. ` +
            `Wait for a stronger directional signal before acting.`,

            `Hold - No clear directional edge at the moment. ${firstSelectedReason}. ` +
            `The stock is trading at $${currentPrice.toFixed(2)}, ${priceVsEma} its 20-day average ($${ema20.toFixed(2)}). ` +
            `Patience is key - let the market decide.`,

            `Hold - The indicators aren't aligned. ${selectedReasons.join("; ")}. ` +
            `Today's ${todayAbs}% ${todayDirection} move is not enough to break the stalemate. ` +
            `Wait for a clearer signal, or consider looking at other opportunities.`,
        ],
    };

    //Pick a random template for signal
    const options = signalTemplates[signal];
    const randomIndex = Math.floor(Math.random() * options.length);
    let explanation: string = options[randomIndex] ?? `${signal} - Based on the current technical indicators.`;

    //Append "Watch For" warning if any warnings exist
    if (warnings.length > 0) {
        const randomWarning = warnings[Math.floor(Math.random() * warnings.length)];
        explanation += ` Watch for: ${randomWarning}`;
    }

    return explanation;
}
