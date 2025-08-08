"use strict"
/**
 * Processes the weather score by animating the score display and updating the DOM.
 * @param {Object} score - The weather score object containing temperature, precipitation,
 *                         wind speed, and daytime information.
 */
function processScore(score) {
    animate(score);

    const temperatureElement = document.querySelector("#temperature");
    const precipitationElement = document.querySelector("#precipitation");
    const windElement = document.querySelector("#wind");
    const daytimeElement = document.querySelector("#daytime");
    const arcText = document.querySelector("#arc-text");
    const arcLoadingSvg = document.querySelector("#arc")
    const postalCode = document.querySelector("#postal-code-input");

    temperatureElement.textContent += `${score.temperature.value}°${score.temperature.unit}`;
    precipitationElement.textContent += `${score.precipitation}%`;
    windElement.textContent += `${score.windSpeed}`;
    daytimeElement.textContent += `${score.daytime ? "Yes" : "No"}`;
    arcText.style.opacity = 1;
    arcLoadingSvg.style.backgroundImage = 'none';
    postalCode.value = score.postalCode;
}

document.addEventListener('DOMContentLoaded', () => {
    getWeatherScore(document.querySelector("#postal-code-input").value).then(processScore);
});

document.addEventListener('change', () => {
    reset();
    getWeatherScore(document.querySelector("#postal-code-input").value).then(processScore);
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/RideFactor/scripts/service-worker.js")
        .then(() => console.log("Service Worker registered"));
}
