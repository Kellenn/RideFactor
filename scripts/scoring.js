// Configuration object for scoring weights, thresholds, and other constants.
const config = {
    // Weights used when combining sub-scores.
    TEMPERATURE_WEIGHT: 0.4,
    PRECIPITATION_WEIGHT: 0.4,
    WIND_WEIGHT: 0.2,
    DAYTIME_BONUS: 0.05,

    // Temperature scoring configuration.
    TEMPERATURE_THRESHOLD: 0.1,
    IDEAL_TEMPERATURE: 70,       // Ideal temperature in degrees.
    TEMPERATURE_STD_DEV: 10,     // Standard deviation for the Gaussian curve.

    // Precipitation scoring configuration.
    PRECIPITATION_ALPHA: 2,            // Exponent to control sensitivity.
    PRECIPITATION_PENALTY_CUTOFF: 65,    // If pChance exceeds this, apply a penalty.
    PRECIPITATION_PENALTY: 0.05,         // Amount to penalize precipitation score.

    // Wind scoring configuration.
    WIND_MIN: 0,
    WIND_MAX: 30,      // Maximum expected wind speed.
    WIND_ALPHA: 5,     // Exponent to control wind sensitivity.
    WIND_THRESHOLD: 40 // Wind speed above which a penalty is applied.
};

/**
 * Compute a temperature score based on a Gaussian function.
 * The score is highest when temp is near the IDEAL_TEMPERATURE.
 *
 * @param {number} temp - The temperature value.
 * @returns {number} A score between 0 and 1.
 */
function getTemperatureScore(temp) {
    // Calculate the Gaussian exponent.
    const exponent = -0.5 * ((temp - config.IDEAL_TEMPERATURE) / config.TEMPERATURE_STD_DEV) ** 2;
    return Math.exp(exponent);
}

/**
 * Compute a precipitation score based on the chance of precipitation.
 * The score is calculated as (1 - fraction)^alpha, with an extra penalty
 * if the chance exceeds a specified cutoff.
 *
 * @param {number} pChance - The chance of precipitation (0 to 100).
 * @returns {number} A score between 0 and 1.
 */
function getPrecipitationScore(pChance) {
    const fraction = pChance / 100;

    let score = Math.pow(1 - fraction, config.PRECIPITATION_ALPHA);

    // If the chance is too high, apply a penalty.
    if (pChance > config.PRECIPITATION_PENALTY_CUTOFF) {
        score = Math.max(score - config.PRECIPITATION_PENALTY, 0);
    }

    return Math.min(Math.max(score, 0), 1);
}

/**
 * Compute a wind score based on wind speed.
 * The score is computed as 1 - (windSpeed / WIND_MAX)^WIND_ALPHA.
 *
 * @param {number} windSpeed - The wind speed.
 * @returns {number} A score between 0 and 1.
 */
function getWindScore(windSpeed) {
    const fraction = (windSpeed / config.WIND_MAX) ** config.WIND_ALPHA;
    const score = 1 - fraction;
    return Math.min(Math.max(score, 0), 1);
}

/**
 * Calculate the overall weather score from the given weather data.
 * This function computes individual scores for temperature, precipitation,
 * and wind, applies weights, applies penalties if necessary, and adds a bonus
 * for daytime. The result is scaled to a 0-10 range and rounded.
 *
 * @param {Object} weather - Weather data containing temperature, precipitation,
 *                           windSpeed, and daytime properties.
 * @returns {number} The final weather score (0 to 10).
 */
function calculateScore(weather) {
    // 1. Compute sub-scores for each weather parameter.
    const temperatureScore = getTemperatureScore(weather.temperature);
    const precipitationScore = getPrecipitationScore(weather.precipitation);
    const windScore = getWindScore(weather.windSpeed);

    // 2. Combine the sub-scores using weighted sum.
    let combinedScore =
        temperatureScore * config.TEMPERATURE_WEIGHT +
        precipitationScore * config.PRECIPITATION_WEIGHT +
        windScore * config.WIND_WEIGHT;

    // 3. Apply penalty if temperature is too low.
    if (temperatureScore < config.TEMPERATURE_THRESHOLD) {
        combinedScore *= 0.25;
    }
    // Apply penalty if wind speed exceeds the threshold.
    if (weather.windSpeed > config.WIND_THRESHOLD) {
        combinedScore *= 0.25;
    }

    // 4. Add a bonus if the weather is during daytime.
    if (weather.daytime) {
        combinedScore += config.DAYTIME_BONUS;
    }

    // 5. Scale to a 0-10 range, clamp to 10, and round to the nearest integer.
    let finalScore = Math.min(combinedScore * 10, 10);
    return Math.round(finalScore);
}
