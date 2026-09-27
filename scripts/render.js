import { app, scoreElement, descriptionElement, ringProgress, meterFill, stats } from "./dom.js";
import { setScore } from "./color.js";

const config = {
    ANIMATION_DURATION: 900,

    // The progress ring is a 270-degree sweep of an 830 unit circumference.
    RING_SWEEP: 622,

    // The arc also thickens with the score
    STROKE_MIN: 1.5,
    STROKE_MAX: 5,
};

/**
 * Drive a value from 0 to 1 over the animation duration, easing out.
 *
 * @param {function(number): void} step - Called with eased progress each frame.
 */
function animateProgress(step) {
    const start = performance.now();

    requestAnimationFrame(function frame(now) {
        const elapsed = Math.min((now - start) / config.ANIMATION_DURATION, 1);
        step(1 - (1 - elapsed) ** 3);
        if (elapsed < 1) requestAnimationFrame(frame);
    });
}

/**
 * Place the arc and the meter at a point in their sweep.
 *
 * @param {number} fraction - The score as a fraction of 10.
 * @param {number} progress - How far through the sweep to draw, 0 to 1.
 */
function drawProgress(fraction, progress) {
    const reached = fraction * progress;
    const strokeGain = (config.STROKE_MAX - config.STROKE_MIN) * fraction;

    ringProgress.style.strokeDasharray = `${config.RING_SWEEP * reached} 830`;
    ringProgress.style.strokeWidth = config.STROKE_MIN + strokeGain * progress;
    meterFill.style.width = `${reached * 100}%`;
}

/**
 * Render a finished score: show the number, sweep the ring or meter in, and
 * fade the stats up.
 *
 * @param {Object} result - A rated forecast from rate().
 * @param {Object} [options] - Rendering options.
 * @param {boolean} [options.animate] - Sweep the arc in, rather than placing
 *   it. False while retuning, where the score should track the slider.
 */
export function render(result, { animate = true } = {}) {
    const { period } = result;

    setScore(result.score);

    descriptionElement.textContent = result.description;

    stats.temperature.textContent = `${period.temperature}°${period.temperatureUnit}`;
    stats.precipitation.textContent =
        period.precipitation === null ? "—" : `${period.precipitation}%`;
    stats.wind.textContent = period.windSpeedLabel;
    stats.daytime.textContent = period.daytime ? "Day" : "Night";
    
    scoreElement.firstChild.textContent = result.score;

    app.dataset.state = "ready";

    const fraction = result.score / 10;

    if (animate) {
        animateProgress(progress => drawProgress(fraction, progress));
    } else {
        drawProgress(fraction, 1);
    }
}

/**
 * Return to the loading state, clearing the previous result. Inline styles set
 * by render() have to go so the indeterminate CSS animations can take over.
 */
export function reset() {
    setScore(null);
    app.dataset.state = "loading";

    scoreElement.firstChild.textContent = "–";
    descriptionElement.textContent = "";
    ringProgress.style.strokeDasharray = "";
    ringProgress.style.strokeWidth = "";
    meterFill.style.width = "";

    Object.values(stats).forEach(element => {
        element.textContent = "—";
    });
}

/**
 * Show a message in place of a score, and stop the loading animation.
 *
 * @param {string} message - Short text to display where the description goes.
 */
export function showError(message) {
    setScore(null);
    app.dataset.state = "error";

    scoreElement.firstChild.textContent = "–";
    descriptionElement.textContent = message;
    ringProgress.style.strokeDasharray = "0 830";
    ringProgress.style.strokeWidth = "";
    meterFill.style.width = "0";
}
