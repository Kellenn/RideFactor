// Return a descriptive string based on the score value.
function getScoreDescription(score) {
    if (score < 1) return "Terrible!";
    if (score < 3) return "Poor";
    if (score < 6) return "OK";
    if (score < 7) return "Better";
    if (score < 8) return "Good";
    if (score < 10) return "Great";
    return "Perfect!";
}

// Helper function to fetch JSON data from a given URL.
async function fetchJson(url) {
    const response = await fetch(url);
    return response.json();
}

async function getWeatherScore(postalCode) {
    let periods, location;

    try {
        // Step 1: Retrieve location information.
        if (postalCode == '') {
            const locationData = await fetchJson("https://ipinfo.io/json/?");
            postalCode = locationData.postal;
        }

        const locationData = await fetchJson(`https://nominatim.openstreetmap.org/search?format=json&country=US&postalcode=${postalCode}`);

        if (locationData.length == 0) {
            return alert("Invalid postal code!");
        }
        
        location = `${locationData[0].lat},${locationData[0].lon}`;


        // Step 2: Get the weather forecast URL for this location.
        const forecastInfo = await fetchJson(`https://api.weather.gov/points/${location}`);
        const forecastUrl = forecastInfo.properties.forecastHourly;

        // Step 3: Fetch the hourly forecast data.
        const forecastData = await fetchJson(forecastUrl);
        periods = forecastData.properties.periods;

    } catch (error) {
        return console.error("Error fetching weather data:", error);
    }

    // Step 4: Process the first three forecast periods.
    const weatherResults = periods.slice(0, 3).map(period => {
        // Extract temperature info.
        const temperatureValue = period.temperature;
        const temperatureUnit = period.temperatureUnit;
        const temperature = { value: temperatureValue, unit: temperatureUnit };

        // Extract precipitation info.
        const precipitation = period.probabilityOfPrecipitation.value;

        // Parse wind speed: remove the trailing unit (e.g., " km/h") and convert to a number.
        const numericWindSpeed = parseInt(period.windSpeed.slice(0, -4));

        const windSpeed = period.windSpeed;

        const daytime = period.isDaytime;

        const weather = {
            temperature: temperatureValue,
            precipitation: precipitation,
            windSpeed: numericWindSpeed,
            daytime: daytime
        };

        const average = calculateScore(weather);

        return {
            temperature: temperature,
            precipitation: precipitation,
            windSpeed: windSpeed,
            daytime: daytime,
            description: getScoreDescription(average),
            average: average,
            postalCode: postalCode
        };
    });

    // Step 5: Select the forecast period with the lowest average score.
    const bestScore = weatherResults.reduce((min, current) => {
        return current.average < min.average ? current : min;
    });

    return bestScore;
}
