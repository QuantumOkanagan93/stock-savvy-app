export type Signal = "BUY" | "HOLD" | "SELL";

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
}