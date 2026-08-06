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

export interface RecommendationInput {
    currentPrice: number;
    todayPercentChange: number;
    weeklyChangePercent: number;
    fiveDayAverage: number;
}

export interface Recommendation {
    signal: Signal;
    explanation: string;
}

const WEEKLY_CHANGE_BUY_THRESHOLD = 3;  //in percent
const WEEKLY_CHANGE_SELL_THRESHOLD = -3;  //in percent

/**
 * Deliberatly simple for MVP: weekly change vs threshold
 * 
 * will change the logic of this after it works to something more complex to analyze
 */

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
    
    switch(signal) {
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