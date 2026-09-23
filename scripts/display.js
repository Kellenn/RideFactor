"use strict"

const displayConfig = {
    ANIMATION_DURATION: 900,

    // The progress ring is a 270-degree sweep of an 830 unit circumference.
    RING_SWEEP: 622,

    // The arc also thickens with the score, so a good day reads as a heavier
    // line and not only a longer one. Pixels, held true by non-scaling-stroke.
    STROKE_MIN: 1.5,
    STROKE_MAX: 5,

    LAYOUTS: ["hairline", "editorial", "bar"],
    THEMES: ["auto", "light", "dark"],

    LAYOUT_KEY: "ridefactor.layout",
    THEME_KEY: "ridefactor.theme",
};

const app = document.querySelector("#app");
const root = document.documentElement;
const scoreElement = document.querySelector("#score");
const descriptionElement = document.querySelector("#description");
const ringProgress = document.querySelector("#ring-progress");
const meterFill = document.querySelector("#meter i");

// The score currently on screen, so the accent can be recomputed when the
// theme changes without refetching the forecast.
let currentScore = null;

/* ------------------------------------------------------------------
   Colour
   ------------------------------------------------------------------ */

/**
 * Read one of the score ramp stops from CSS as [r, g, b]. Keeping the stops
 * in CSS lets each theme define its own ramp.
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
function scoreColor(score) {
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
function refreshAccent() {
    if (currentScore === null) return;
    root.style.setProperty("--accent", scoreColor(currentScore));
}

/* ------------------------------------------------------------------
   Rendering
   ------------------------------------------------------------------ */

/**
 * Drive a value from 0 to 1 over the animation duration, easing out.
 *
 * @param {function(number): void} step - Called with eased progress each frame.
 */
function animateProgress(step) {
    const start = performance.now();

    requestAnimationFrame(function frame(now) {
        const elapsed = Math.min((now - start) / displayConfig.ANIMATION_DURATION, 1);
        step(1 - (1 - elapsed) ** 3);
        if (elapsed < 1) requestAnimationFrame(frame);
    });
}

/**
 * Render a finished score: show the number, sweep the ring or meter in, and
 * fade the stats up.
 *
 * @param {Object} result - A score result from getWeatherScore.
 */
function render(result) {
    currentScore = result.average;
    refreshAccent();

    descriptionElement.textContent = result.description;

    document.querySelector("#temperature").textContent =
        `${result.temperature.value}°${result.temperature.unit}`;
    document.querySelector("#precipitation").textContent =
        result.precipitation === null ? "—" : `${result.precipitation}%`;
    document.querySelector("#wind").textContent = result.windSpeed;
    document.querySelector("#daytime").textContent = result.daytime ? "Day" : "Night";

    // The number lands on its final value immediately. Counting it up would
    // flash a 0 first, which reads as the worst possible score.
    scoreElement.firstChild.textContent = result.average;
    app.dataset.state = "ready";

    // The arc grows in both length and weight as it sweeps in.
    const fraction = result.average / 10;
    const strokeGain = (displayConfig.STROKE_MAX - displayConfig.STROKE_MIN) * fraction;

    animateProgress(progress => {
        const reached = fraction * progress;
        ringProgress.style.strokeDasharray = `${displayConfig.RING_SWEEP * reached} 830`;
        ringProgress.style.strokeWidth = displayConfig.STROKE_MIN + strokeGain * progress;
        meterFill.style.width = `${reached * 100}%`;
    });
}

/**
 * Return to the loading state, clearing the previous result. Inline styles set
 * by render() have to go so the indeterminate CSS animations can take over.
 */
function reset() {
    currentScore = null;
    app.dataset.state = "loading";

    scoreElement.firstChild.textContent = "–";
    descriptionElement.textContent = "";
    ringProgress.style.strokeDasharray = "";
    ringProgress.style.strokeWidth = "";
    meterFill.style.width = "";

    ["#temperature", "#precipitation", "#wind", "#daytime"].forEach(selector => {
        document.querySelector(selector).textContent = "—";
    });
}

/**
 * Show a message in place of a score, and stop the loading animation.
 *
 * @param {string} message - Short text to display where the description goes.
 */
function showError(message) {
    currentScore = null;
    app.dataset.state = "error";

    scoreElement.firstChild.textContent = "–";
    descriptionElement.textContent = message;
    ringProgress.style.strokeDasharray = "0 830";
    ringProgress.style.strokeWidth = "";
    meterFill.style.width = "0";
}

/* ------------------------------------------------------------------
   Layout and theme
   ------------------------------------------------------------------ */

/**
 * Read a stored preference, falling back when storage is unavailable or holds
 * something unrecognised.
 *
 * @param {string} key - Storage key.
 * @param {string[]} allowed - Permitted values.
 * @param {string} fallback - Value to use otherwise.
 * @returns {string} The preference to apply.
 */
function readPreference(key, allowed, fallback) {
    try {
        const stored = localStorage.getItem(key);
        return allowed.includes(stored) ? stored : fallback;
    } catch {
        return fallback;
    }
}

function writePreference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Private browsing or blocked storage: the choice just will not persist.
    }
}

function applyLayout(layout) {
    app.dataset.layout = layout;
    document.querySelectorAll("[data-layout-option]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.layoutOption === layout));
    });
}

function applyTheme(theme) {
    if (theme === "auto") {
        delete root.dataset.theme;
    } else {
        root.dataset.theme = theme;
    }

    const toggle = document.querySelector("#theme-toggle");
    toggle.textContent = theme;
    toggle.setAttribute("aria-label", `Theme: ${theme}`);

    // The ramp differs per theme, so the accent has to be recomputed.
    refreshAccent();
}

/**
 * Wire up the layout buttons and the theme cycle, restoring stored choices.
 */
function initControls() {
    let layout = readPreference(displayConfig.LAYOUT_KEY, displayConfig.LAYOUTS, "hairline");
    let theme = readPreference(displayConfig.THEME_KEY, displayConfig.THEMES, "auto");

    applyLayout(layout);
    applyTheme(theme);

    document.querySelectorAll("[data-layout-option]").forEach(button => {
        button.addEventListener("click", () => {
            layout = button.dataset.layoutOption;
            applyLayout(layout);
            writePreference(displayConfig.LAYOUT_KEY, layout);
        });
    });

    document.querySelector("#theme-toggle").addEventListener("click", () => {
        const next = displayConfig.THEMES[(displayConfig.THEMES.indexOf(theme) + 1) % displayConfig.THEMES.length];
        theme = next;
        applyTheme(theme);
        writePreference(displayConfig.THEME_KEY, theme);
    });

    // While on "auto", follow the system flipping between light and dark.
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
        if (theme === "auto") refreshAccent();
    });
}
