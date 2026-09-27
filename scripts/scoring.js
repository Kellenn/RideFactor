/**
 * The rider profile
 *
 * The defaults describe a rider happiest around 72°F who stops at about 50°F.
 */
const DEFAULT_PROFILE = {
    idealTemperature: 72,
    coldestRide: 50,
    hottestRide: 95,
    windTolerance: 25,
    rainTolerance: 40,
};

const model = {
    // Weights used when combining sub-scores into the base score.
    TEMPERATURE_WEIGHT: 0.4,
    PRECIPITATION_WEIGHT: 0.4,
    WIND_WEIGHT: 0.2,

    // Night riding is harder at any temperature
    NIGHT_FACTOR: 0.9,

    // Two spreads rather than one, since riding is not symmetric
    TEMPERATURE_SPREAD_COLD: 13,
    TEMPERATURE_SPREAD_HOT: 17,

    PRECIPITATION_ALPHA: 2,

    // A squared falloff
    WIND_MAX: 40,
    WIND_ALPHA: 2,
};

// How far past a stated limit each ceiling reaches. These offsets are what
// make a limit read as "marginal" rather than "impossible": the coldest
// temperature you will ride scores around 4 or 5, not 0. Cold and heat use
// different offsets for the same reason their curves use different spreads.
const offsets = {
    COLD_FREE: 18,    // °F above the cold limit at which cold stops mattering
    COLD_ZERO: -15,   // °F below it at which the score is capped to zero
    HEAT_FREE: -7,    // °F below the heat limit at which heat starts to matter
    HEAT_ZERO: 15,
    WIND_FREE: -7,    // mph below the wind limit at which wind starts to matter
    WIND_ZERO: 20,
    RAIN_FREE: 0,     // % at which rain starts to matter
    RAIN_ZERO: 50,
};

/**
 * Turn a rider profile into the curve centres and ceilings the scorer uses.
 *
 * @param {Object} profile - A rider profile.
 * @returns {Object} Derived scoring configuration.
 */
function deriveConfig(profile) {
    return {
        IDEAL_TEMPERATURE: profile.idealTemperature,

        COLD_CAP_FREE: profile.coldestRide + offsets.COLD_FREE,
        COLD_CAP_ZERO: profile.coldestRide + offsets.COLD_ZERO,
        HEAT_CAP_FREE: profile.hottestRide + offsets.HEAT_FREE,
        HEAT_CAP_ZERO: profile.hottestRide + offsets.HEAT_ZERO,
        WIND_CAP_FREE: profile.windTolerance + offsets.WIND_FREE,
        WIND_CAP_ZERO: profile.windTolerance + offsets.WIND_ZERO,
        PRECIPITATION_CAP_FREE: profile.rainTolerance + offsets.RAIN_FREE,
        PRECIPITATION_CAP_ZERO: profile.rainTolerance + offsets.RAIN_ZERO,
    };
}

/**
 * Clamp a value into the 0 to 1 range.
 *
 * @param {number} value - The value to clamp.
 * @returns {number} The value, held within 0 and 1.
 */
function clamp(value) {
    return Math.min(Math.max(value, 0), 1);
}

/**
 * A straight line from 0 at `zero` to 1 at `free`.
 *
 * @param {number} value - The measurement to place on the ramp.
 * @param {number} zero - Value at which the ramp reaches 0.
 * @param {number} free - Value at which the ramp reaches 1.
 * @returns {number} A ceiling between 0 and 1.
 */
function ramp(value, zero, free) {
    return clamp((value - zero) / (free - zero));
}

/**
 * Compute a temperature score based on a Gaussian function, centred on the
 * rider's ideal and falling away faster below it than above.
 *
 * @param {number} temp - The temperature value.
 * @param {Object} config - Derived configuration.
 * @returns {number} A score between 0 and 1.
 */
function getTemperatureScore(temp, config) {
    const spread = temp < config.IDEAL_TEMPERATURE
        ? model.TEMPERATURE_SPREAD_COLD
        : model.TEMPERATURE_SPREAD_HOT;

    const exponent = -0.5 * ((temp - config.IDEAL_TEMPERATURE) / spread) ** 2;
    return Math.exp(exponent);
}

/**
 * Compute a precipitation score from the chance of precipitation, as
 * (1 - fraction)^alpha. High chances are handled by the ceiling in
 * calculateScore rather than by a penalty here.
 *
 * @param {number} pChance - The chance of precipitation (0 to 100).
 * @returns {number} A score between 0 and 1.
 */
function getPrecipitationScore(pChance) {
    const fraction = pChance / 100;
    return clamp((1 - fraction) ** model.PRECIPITATION_ALPHA);
}

/**
 * Compute a wind score based on wind speed.
 *
 * @param {number} windSpeed - The wind speed in mph.
 * @returns {number} A score between 0 and 1.
 */
function getWindScore(windSpeed) {
    return clamp(1 - (windSpeed / model.WIND_MAX) ** model.WIND_ALPHA);
}

/**
 * Calculate the overall weather score from the given weather data.
 *
 * @param {Object} weather - Weather data containing temperature, precipitation,
 *                           windSpeed, and daytime properties.
 * @param {Object} [profile] - Rider profile; the defaults if none is given.
 * @returns {number} The final weather score (0 to 10).
 */
function calculateScore(weather, profile = DEFAULT_PROFILE) {
    const config = deriveConfig(profile);
    
    const precipitation = weather.precipitation ?? 0;

    const base =
        getTemperatureScore(weather.temperature, config) * model.TEMPERATURE_WEIGHT +
        getPrecipitationScore(precipitation) * model.PRECIPITATION_WEIGHT +
        getWindScore(weather.windSpeed) * model.WIND_WEIGHT;

    const ceiling = Math.min(
        ramp(weather.windSpeed, config.WIND_CAP_ZERO, config.WIND_CAP_FREE),
        ramp(weather.temperature, config.COLD_CAP_ZERO, config.COLD_CAP_FREE),
        ramp(weather.temperature, config.HEAT_CAP_ZERO, config.HEAT_CAP_FREE),
        ramp(precipitation, config.PRECIPITATION_CAP_ZERO, config.PRECIPITATION_CAP_FREE),
    );

    const light = weather.daytime ? 1 : model.NIGHT_FACTOR;

    return Math.round(Math.min(base, ceiling) * light * 10);
}

export { calculateScore, DEFAULT_PROFILE };
