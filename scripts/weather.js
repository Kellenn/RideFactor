import { readPreference, writePreference } from "./preferences.js";

export class DisplayError extends Error {}

const CACHE_PREFIX = "cache1:";

/**
 * Read a cached lookup.
 *
 * @param {string} key - Cache key, without the prefix.
 * @returns {*} The stored value, or undefined when nothing usable is stored.
 */
function readCached(key) {
  return readPreference(
    CACHE_PREFIX + key,
    (raw) => (raw === null ? undefined : JSON.parse(raw)),
    undefined,
  );
}

/**
 * Drop a cached lookup.
 *
 * @param {string} key - Cache key, without the prefix.
 */
function forget(key) {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    ;
  }
}

/**
 * Return the stored value for a key
 *
 * @param {string} key - Cache key, without the prefix.
 * @param {function(): Promise<*>} lookup - Fetches the value when missing.
 * @returns {Promise<*>} The cached or freshly fetched value.
 */
async function cached(key, lookup) {
  const stored = readCached(key);
  if (stored !== undefined) return stored;

  const value = await lookup();
  writePreference(CACHE_PREFIX + key, JSON.stringify(value));
  return value;
}

/**
 * Round a coordinate to about a hundred metres.
 *
 *
 * @param {number} value - A latitude or longitude.
 * @returns {number} The rounded coordinate.
 */
function trim(value) {
  return Number(value.toFixed(3));
}

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

/**
 * Look up the postal code covering a set of coordinates, so a GPS-located
 * score can still name the area it is for.
 *
 * @param {{lat: number, lon: number}} coords - Trimmed coordinates.
 * @returns {Promise<string>} The postal code, or "" if it cannot be found.
 */
async function getPostalCodeForCoords({ lat, lon }) {
  try {
    return await cached(`coords:${lat},${lon}`, async () => {
      const data = await fetchJson(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      );
      return data.address?.postcode ?? "";
    });
  } catch {
    return "";
  }
}

/**
 * Look up the coordinates at the centre of a postal code.
 *
 * @param {string} postalCode - The postal code to locate.
 * @returns {Promise<string|null>} "lat,lon", or null if there is no such code.
 */
function getCoordsForPostalCode(postalCode) {
  return cached(`postal:${postalCode}`, async () => {
    const locationData = await fetchJson(
      `https://nominatim.openstreetmap.org/search?format=json&country=US&postalcode=${postalCode}`,
    );

    if (locationData.length === 0) return null;

    return `${locationData[0].lat},${locationData[0].lon}`;
  });
}

/**
 * Fetch the hourly forecast periods covering a point.
 *
 * @param {string} location - "lat,lon".
 * @returns {Promise<Object[]>} Raw periods from the NWS hourly forecast.
 */
async function fetchForecastPeriods(location) {
  const key = `points:${location}`;
  const wasCached = readCached(key) !== undefined;

  const load = async () => {
    const forecastUrl = await cached(key, async () => {
      const forecastInfo = await fetchJson(
        `https://api.weather.gov/points/${location}`,
      );
      return forecastInfo.properties.forecastHourly;
    });

    const forecastData = await fetchJson(forecastUrl);
    return forecastData.properties.periods;
  };

  try {
    return await load();
  } catch (error) {
    if (!wasCached) throw error;
    forget(key);
    return load();
  }
}

/**
 * Turn raw forecast period into a usable shape
 *
 * @param {Object} period - A period from the NWS hourly forecast.
 * @returns {Object} A normalised period.
 */
function normalisePeriod(period) {
  return {
    temperature: period.temperature,
    temperatureUnit: period.temperatureUnit,
    precipitation: period.probabilityOfPrecipitation.value,
    windSpeed: parseInt(period.windSpeed, 10),
    windSpeedLabel: period.windSpeed,

    daytime: period.isDaytime,
  };
}

/**
 * Fetch the next few hours of forecast for a postal code, or for wherever the
 * browser says it is when none is given.
 *
 * @param {string} postalCode - A postal code, or "" to locate automatically.
 * @returns {Promise<{postalCode: string, periods: Object[]}>} The forecast.
 */
export async function getForecast(postalCode) {
  let periods, location;

  try {
    if (postalCode !== "") {
      location = await getCoordsForPostalCode(postalCode);
      if (location === null) throw new DisplayError("Invalid postal code");
    }

    else {
      try {
        const coords = await getBrowserLocation();
        const lat = trim(coords.lat);
        const lon = trim(coords.lon);
        location = `${lat},${lon}`;
        postalCode = await getPostalCodeForCoords({ lat, lon });
      } catch (gpsError) {
        const locationData = await fetchJson("https://ipinfo.io/json/?");
        postalCode = locationData.postal;

        location = await getCoordsForPostalCode(postalCode);
        if (location === null) {
          throw new Error(`No match for IP postal code ${postalCode}`);
        }
      }
    }

    periods = await fetchForecastPeriods(location);
  } catch (error) {
    if (error instanceof DisplayError) throw error;
    throw new DisplayError("Weather unavailable", { cause: error });
  }

  return {
    postalCode,
    periods: periods.slice(0, 3).map(normalisePeriod),
  };
}
