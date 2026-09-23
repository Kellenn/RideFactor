"use strict"

const postalCodeInput = document.querySelector("#postal-code-input");

/**
 * Fetch a score for the current postal code input and render it, showing a
 * message in place of the score if anything goes wrong.
 */
function requestScore() {
    getWeatherScore(postalCodeInput.value)
        .then(result => {
            render(result);
            // A blank field resolves to a located postal code; show which one.
            postalCodeInput.value = result.postalCode;
        })
        .catch(error => {
            console.error(error);
            showError(error instanceof DisplayError ? error.message : "Something went wrong");
        });
}

initControls();
requestScore();

postalCodeInput.addEventListener("change", () => {
    reset();
    requestScore();
});

// The PWA was removed. Unregister any service worker and drop any caches left
// over from an earlier install, which would otherwise go on serving the build
// they cached instead of this one.
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
        .then(registrations => registrations.forEach(registration => registration.unregister()));
}

if ("caches" in window) {
    caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
}
