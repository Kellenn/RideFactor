import { readPreference, writePreference } from "./preferences.js";
import { DEFAULT_PROFILE } from "./scoring.js";

const PROFILE_KEY = "ridefactor.profile";

/**
 * The tunable fields, in the order they appear in the panel.
 **/
export const FIELDS = [
    { key: "idealTemperature", section: "temperature", label: "Ideal temperature", min: 55, max: 95, step: 1, unit: "°F" },
    { key: "coldestRide", section: "temperature", label: "Coldest you'll ride", min: 20, max: 70, step: 1, unit: "°F" },
    { key: "hottestRide", section: "temperature", label: "Hottest you'll ride", min: 75, max: 115, step: 1, unit: "°F" },
    { key: "windTolerance", section: "wind", label: "Wind you'll put up with", min: 5, max: 45, step: 1, unit: " mph" },
    { key: "rainTolerance", section: "precipitation", label: "Rain chance you'll take", min: 0, max: 90, step: 5, unit: "%" },
];

// The ideal has to stay clear of both limits or the curves cross over.
const IDEAL_MARGIN = 5;

/**
 * Hold a profile to sane values.
 *
 * @param {Object} profile - A candidate profile.
 * @returns {Object} A profile safe to score with.
 */
export function clampProfile(profile) {
    const held = {};

    for (const field of FIELDS) {
        const value = Number(profile[field.key]);
        held[field.key] = Number.isFinite(value)
            ? Math.min(Math.max(value, field.min), field.max)
            : DEFAULT_PROFILE[field.key];
    }

    held.coldestRide = Math.min(held.coldestRide, held.idealTemperature - IDEAL_MARGIN);
    held.hottestRide = Math.max(held.hottestRide, held.idealTemperature + IDEAL_MARGIN);

    return held;
}

/**
 * Read the stored profile, falling back to the defaults.
 *
 * @returns {Object} The rider profile to score with.
 */
export function readProfile() {
    return readPreference(PROFILE_KEY, raw => {
        if (raw === null) return undefined;
        return clampProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
    }, DEFAULT_PROFILE);
}

/**
 * Return a profile with some fields put back to their defaults and the rest
 * left as they are.
 *
 * @param {Object} profile - The profile to start from.
 * @param {string[]} keys - The field keys to reset.
 * @returns {Object} A profile safe to score with.
 */
export function resetFields(profile, keys) {
    const reset = { ...profile };

    for (const key of keys) {
        reset[key] = DEFAULT_PROFILE[key];
    }

    return clampProfile(reset);
}

/**
 * Store the profile.
 *
 * @param {Object} profile - The profile to persist.
 */
export function writeProfile(profile) {
    writePreference(PROFILE_KEY, JSON.stringify(profile));
}
