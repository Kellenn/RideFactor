/**
 * Read a stored preference, falling back when storage is unavailable or holds
 * something unrecognised.
 *
 * @param {string} key - Storage key.
 * @param {function(string|null): *} accept - Turns the raw string into a value,
 *   or returns undefined to reject it.
 * @param {*} fallback - Value to use otherwise.
 * @returns {*} The preference to apply.
 */
export function readPreference(key, accept, fallback) {
    try {
        const value = accept(localStorage.getItem(key));
        return value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

/**
 * Store a preference, ignoring failures.
 *
 * @param {string} key - Storage key.
 * @param {string} value - Value to store.
 */
export function writePreference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Private browsing or blocked storage: the choice just will not persist.
    }
}
