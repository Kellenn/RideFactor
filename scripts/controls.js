import { app, root } from "./dom.js";
import { refreshAccent } from "./color.js";
import { readPreference, writePreference } from "./preferences.js";
import { drawCharts } from "./settings.js";

const config = {
    LAYOUTS: ["hairline", "editorial", "bar"],
    THEMES: ["auto", "light", "dark"],

    LAYOUT_KEY: "ridefactor.layout",
    THEME_KEY: "ridefactor.theme",
};

/**
 * Accept a stored value only if it is one of the permitted options.
 *
 * @param {string[]} allowed - Permitted values.
 * @returns {function(string|null): (string|undefined)} An accept function.
 */
function oneOf(allowed) {
    return stored => (allowed.includes(stored) ? stored : undefined);
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

    refreshAccent();
    drawCharts();
}

/**
 * Wire up the layout buttons and the theme cycle, restoring stored choices.
 */
export function initControls() {
    let layout = readPreference(config.LAYOUT_KEY, oneOf(config.LAYOUTS), "hairline");
    let theme = readPreference(config.THEME_KEY, oneOf(config.THEMES), "auto");

    applyLayout(layout);
    applyTheme(theme);

    document.querySelectorAll("[data-layout-option]").forEach(button => {
        button.addEventListener("click", () => {
            layout = button.dataset.layoutOption;
            applyLayout(layout);
            writePreference(config.LAYOUT_KEY, layout);
        });
    });

    document.querySelector("#theme-toggle").addEventListener("click", () => {
        theme = config.THEMES[(config.THEMES.indexOf(theme) + 1) % config.THEMES.length];
        applyTheme(theme);
        writePreference(config.THEME_KEY, theme);
    });

    matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
        if (theme === "auto") refreshAccent();
    });
}
