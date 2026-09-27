import { root } from "./dom.js";

let currentScore = null;

/**
 * Read one of the score ramp stops from CSS as [r, g, b].
 *
 * @param {string} name - Custom property name, e.g. "--stop-mid".
 * @returns {number[]} The stop's RGB channels.
 */
function readStop(name) {
    return getComputedStyle(root).getPropertyValue(name).trim().split(/[\s,]+/).map(Number);
}

/**
 * Interpolate the score ramp: bad at 0, mid at 5, good at 10.
 *
 * @param {number} score - The score (0 to 10).
 * @returns {string} An rgb() colour for the current theme.
 */
export function scoreColor(score) {
    const below = score <= 5;
    const from = readStop(below ? "--stop-bad" : "--stop-mid");
    const to = readStop(below ? "--stop-mid" : "--stop-good");
    const t = Math.min(Math.max((below ? score : score - 5) / 5, 0), 1);

    const mixed = from.map((channel, i) => Math.round(channel + (to[i] - channel) * t));

    return `rgb(${mixed.join(", ")})`;
}

/**
 * Point the accent token at the colour for the score on screen.
 */
export function refreshAccent() {
    if (currentScore === null) return;
    root.style.setProperty("--accent", scoreColor(currentScore));
}

/**
 * Record the score the accent should track, and apply it.
 *
 * @param {number|null} score - The score on screen, or null when there is none.
 */
export function setScore(score) {
    currentScore = score;
    refreshAccent();
}
