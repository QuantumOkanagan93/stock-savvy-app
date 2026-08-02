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

