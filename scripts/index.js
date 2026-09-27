import { getForecast, DisplayError } from "./weather.js";
import { rate } from "./rating.js";
import { render, reset, showError } from "./render.js";
import { initControls } from "./controls.js";
import { initSettings } from "./settings.js";

const postalCodeInput = document.querySelector("#postal-code-input");

let forecast = null;
let profile = null;

/**
 * Score the forecast in hand against the current profile and show it.
 *
 * @param {Object} [options] - Passed through to render().
 */
function show(options) {
    if (forecast === null) return;
    render(rate(forecast, profile), options);
}

/**
 * Fetch a forecast for the current postal code input and render it, showing a
 * message in place of the score if anything goes wrong.
 */
function requestScore() {
    getForecast(postalCodeInput.value)
        .then(result => {
            forecast = result;
            show();
            // A blank field resolves to a located postal code; show which one.
            postalCodeInput.value = result.postalCode;
        })
        .catch(error => {
            console.error(error);
            showError(error instanceof DisplayError ? error.message : "Something went wrong");
        });
}

initControls();

profile = initSettings(next => {
    profile = next;
    show({ animate: false });
});

requestScore();

postalCodeInput.addEventListener("change", () => {
    forecast = null;
    reset();
    requestScore();
});