import { calculateScore } from "./scoring.js";

/**
 * Return a descriptive string based on the score value.
 *
 * @param {number} score - The score (0 to 10).
 * @returns {string} A short label.
 */
function getScoreDescription(score) {
  if (score < 1) return "Terrible!";
  if (score < 3) return "Poor";
  if (score < 6) return "OK";
  if (score < 7) return "Better";
  if (score < 8) return "Good";
  if (score < 10) return "Great";
  return "Perfect!";
}

/**
 * Score a forecast against a rider profile and pick the hour to report.
 *
 * @param {{postalCode: string, periods: Object[]}} forecast - From getForecast.
 * @param {Object} profile - The rider profile to score against.
 * @returns {Object} The period to show, its score, and a description.
 */
export function rate(forecast, profile) {
  const scored = forecast.periods.map(period => ({
    period,
    score: calculateScore(period, profile),
  }));

  const worst = scored.reduce((lowest, current) =>
    current.score < lowest.score ? current : lowest,
  );

  return {
    postalCode: forecast.postalCode,
    period: worst.period,
    score: worst.score,
    description: getScoreDescription(worst.score),
  };
}
