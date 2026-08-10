import { mock } from "node:test";
import { generateRecommendation } from "../services/market-data/recommendation/RecommendationEngine";
import type { OHLCVBar } from "../services/market-data/recommendation/RecommendationEngine";


interface FlipThresholds {
    buyToHold: number | null;  //Price below BUY becomes HOLD
    holdToSell: number | null; //Price below which HOLD becomes SELL
}

export function calculateFlipThresholds(
    originalCandles: OHLCVBar[],
    currentPrice: number,
    currentPercentChange: number,
): FlipThresholds {
    if (originalCandles.length < 30) {
        return { buyToHold: null, holdToSell: null };
    }

    //Search between -30% and +30% of current price
    let low = currentPrice * 0.7;
    let high = currentPrice * 1.3;

    let buyToHold: number | null = null;
    let holdToSell: number | null = null;

    //Find BUY -> HOLD threshold (score drops below 0.25)
    if (currentPercentChange > 0.25) {
        //start from a BUY, find where it flips to HOLD
        let lo = currentPrice * 0.7;
        let hi = currentPrice;
        for (let i = 0; i < 30; i++) {
            const mid = (lo + hi) / 2;
            const mockChange = ((mid - currentPrice) / currentPrice) * 100;
            const rec = generateRecommendation(originalCandles, mockChange);
            if (rec.score > 0.25) {
                lo = mid;  //still BUY, go lower
            } else {
                hi = mid;  //now HOLD, go higher
            }
        }
        buyToHold = Math.round((lo + hi) / 2 * 100) / 100;
    }

    //Find HOLD -> ELL threshold (score drops below -0.25)
    if (currentPercentChange > -0.25) {
        let lo = currentPrice * 0.7;
        let hi = currentPrice;

        for (let i = 0; i < 30; i++) {
            const mid = (lo + hi) / 2;
            const mockChange = ((mid - currentPrice) / currentPrice) * 100;
            const rec = generateRecommendation(originalCandles, mockChange);
            if (rec.score > -0.25) {
                lo = mid;  //still above SELL, go lower
            } else {
                high = mid;  //now SELL, go higher
            }
        }
        holdToSell = Math.round((lo + hi) / 2 * 100) / 100;
    }
    return { buyToHold, holdToSell };
}