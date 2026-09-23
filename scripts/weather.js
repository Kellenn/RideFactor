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

// An error whose message is meant to be shown to the user as-is.
class DisplayError extends Error {}

// Helper function to fetch JSON data from a given URL.
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}`);
  }
  return response.json();
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }),
      (error) => reject(error),
    );
  });
}

async function getWeatherScore(postalCode) {
  let periods, location;

  try {
    // If a postal code was provided, convert it to lat/lon
    if (postalCode !== "") {
      const locationData = await fetchJson(
        `https://nominatim.openstreetmap.org/search?format=json&country=US&postalcode=${postalCode}`,
      );

      if (locationData.length == 0) {
        throw new DisplayError("Invalid postal code");
      }
      location = `${locationData[0].lat},${locationData[0].lon}`;
    }
    // If NO postal code was provided, try Browser GPS, then IP fallback
    else {
      try {
        const coords = await getBrowserLocation();
        location = `${coords.lat},${coords.lon}`;
      } catch (gpsError) {
        // GPS unavailable or denied: fall back to an IP address lookup.
        const locationData = await fetchJson("https://ipinfo.io/json/?");
        postalCode = locationData.postal;

        // Convert the IP's postal code to lat/lon
        const ipLocationData = await fetchJson(
          `https://nominatim.openstreetmap.org/search?format=json&country=US&postalcode=${postalCode}`,
        );
        location = `${ipLocationData[0].lat},${ipLocationData[0].lon}`;
      }
    }

    // Step 2: Get the weather forecast URL for this location.
    const forecastInfo = await fetchJson(
      `https://api.weather.gov/points/${location}`,
    );
    const forecastUrl = forecastInfo.properties.forecastHourly;

    // Step 3: Fetch the hourly forecast data.
    const forecastData = await fetchJson(forecastUrl);
    periods = forecastData.properties.periods;
  } catch (error) {
    if (error instanceof DisplayError) throw error;
    throw new DisplayError("Weather unavailable", { cause: error });
  }

  // Step 4: Process the first three forecast periods.
  const weatherResults = periods.slice(0, 3).map((period) => {
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
      daytime: daytime,
    };

    const average = calculateScore(weather);

    return {
      temperature: temperature,
      precipitation: precipitation,
      windSpeed: windSpeed,
      daytime: daytime,
      description: getScoreDescription(average),
      average: average,
      postalCode: postalCode,
    };
  });

  // Step 5: Select the forecast period with the lowest average score.
  const bestScore = weatherResults.reduce((min, current) => {
    return current.average < min.average ? current : min;
  });

  return bestScore;
}
