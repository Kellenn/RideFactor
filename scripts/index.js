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

    temperatureElement.textContent = `Temperature: ${score.temperature.value}°${score.temperature.unit}`;
    precipitationElement.textContent = `Precipitation: ${score.precipitation}%`;
    windElement.textContent = `Wind: ${score.windSpeed}`;
    daytimeElement.textContent = `Daytime: ${score.daytime ? "Yes" : "No"}`;
}

document.addEventListener('DOMContentLoaded', () => {
    getWeatherScore().then(processScore);
});
