import { FIELDS, clampProfile, readProfile, resetFields, writeProfile } from "./profile.js";
import { readPreference, writePreference } from "./preferences.js";
import { calculateScore } from "./scoring.js";
import { buildBars, paintBars, buildGrid, paintGrid } from "./charts.js";

// Conditions held benign while one axis is swept
const BENIGN = { temperature: 72, precipitation: 0, windSpeed: 5, daytime: true };

// Enough bars to read as a curve
const BARS = 44;

/**
 * The three factors, in panel order.
 */
const FACTORS = [
    {
        key: "temperature",
        name: "Temperature",
        short: "temperature",
        note: "Dry and calm.",
        min: 25,
        max: 105,
        unit: "°F",
        at: profile => `${profile.idealTemperature}°F ideal`,
        sample: temperature => ({ ...BENIGN, temperature }),
    },
    {
        key: "wind",
        name: "Wind",
        short: "wind",
        note: "At your ideal temperature, dry.",
        min: 0,
        max: 60,
        unit: " mph",
        at: profile => `${profile.windTolerance} mph limit`,
        sample: (windSpeed, profile) => ({
            ...BENIGN,
            temperature: profile.idealTemperature,
            windSpeed,
        }),
    },
    {
        key: "precipitation",
        name: "Precipitation",
        short: "rain",
        note: "At your ideal temperature, calm.",
        min: 0,
        max: 100,
        unit: "%",
        at: profile => `${profile.rainTolerance}% limit`,
        sample: (precipitation, profile) => ({
            ...BENIGN,
            temperature: profile.idealTemperature,
            precipitation,
        }),
    },
];

// Temperature across. 
const COMBINED = {
    columns: 17,
    rows: 11,
    x: { title: "Temperature", min: 25, max: 105, unit: "°F", ticks: [25, 45, 65, 85, 105] },
};

const AXES = [
    {
        key: "rain",
        title: "Rain chance",
        label: "Rain",
        min: 0,
        max: 100,
        unit: "%",
        ticks: [100, 50, 0],
        note: "In calm air.",
        weather: precipitation => ({ precipitation }),
    },
    {
        key: "wind",
        title: "Wind",
        label: "Wind",
        min: 0,
        max: 50,
        unit: " mph",
        ticks: [50, 25, 0],
        note: "With no rain.",
        weather: windSpeed => ({ windSpeed }),
    },
];

const AXIS_KEY = "ridefactor.axis";

const panel = document.querySelector("#settings");
const pinnedHost = document.querySelector("#settings-pinned");
const axisHost = document.querySelector("#settings-axes");
const rowList = document.querySelector("#settings-rows");
const toggle = document.querySelector("#settings-toggle");
const doneButton = document.querySelector("#settings-done");
const resetButton = document.querySelector("#settings-reset");
const resetAllButton = document.querySelector("#settings-reset-all");
const behind = [document.querySelector("#panel"), document.querySelector("#controls")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let profile = readProfile();
let onChange = () => {};


const controls = new Map();
const rows = new Map();

let open = FACTORS[0].key;

let axis = AXES[0];
const axisButtons = new Map();

let paintMap = () => {};

const charts = [];

/**
 * The fields a factor carries sliders for.
 *
 * @param {Object} factor - An entry from FACTORS.
 * @returns {Object[]} Entries from FIELDS.
 */
function ownFields(factor) {
    return FIELDS.filter(field => field.section === factor.key);
}

/**
 * Build a labelled slider for one field.
 *
 * @param {Object} field - An entry from FIELDS.
 * @returns {HTMLElement} The row to append.
 */
function buildField(field) {
    const row = document.createElement("label");
    row.className = "setting";

    const name = document.createElement("span");
    name.className = "setting-label";
    name.textContent = field.label;

    const value = document.createElement("span");
    value.className = "setting-value";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = field.min;
    slider.max = field.max;
    slider.step = field.step;
    slider.value = profile[field.key];

    slider.addEventListener("input", () => {
        profile = clampProfile({ ...profile, [field.key]: Number(slider.value) });
        showProfile();
        writeProfile(profile);
        onChange(profile);
    });

    row.append(name, value, slider);
    controls.set(field.key, { slider, value, field });
    return row;
}

/**
 * Build the pair of labels that sit at either end of an axis.
 *
 * @param {string} className - Class for the wrapper.
 * @param {number[]} values - The two ends, in reading order.
 * @param {string} unit - Suffix for each label.
 * @returns {HTMLElement} The scale.
 */
function buildScale(className, values, unit) {
    const scale = document.createElement("div");
    scale.className = className;

    for (const value of values) {
        const label = document.createElement("span");
        label.textContent = `${value}${unit}`;
        scale.append(label);
    }

    return scale;
}

/**
 * Build the caption under a chart, saying what was held still to draw it.
 *
 * @param {string} text - The caption.
 * @returns {HTMLElement} The note.
 */
function buildNote(text) {
    const note = document.createElement("p");
    note.className = "chart-note";
    note.textContent = text;
    return note;
}

/**
 * Build a chart sweeping one axis: the score along it, as bars.
 *
 * @param {Object} factor - An entry from FACTORS.
 * @returns {HTMLElement} The chart.
 */
function buildSweep(factor) {
    const bars = buildBars(BARS);

    const chart = document.createElement("div");
    chart.className = "chart";
    chart.append(
        bars,
        buildScale("chart-scale", [factor.min, factor.max], factor.unit),
        buildNote(factor.note),
    );

    charts.push(() => {
        const span = factor.max - factor.min;

        paintBars(bars, Array.from({ length: BARS }, (ignored, i) => {
            const value = factor.min + (span * i) / (BARS - 1);
            const score = calculateScore(factor.sample(value, profile), profile);
            return { score, label: `${Math.round(value)}${factor.unit}: ${score}/10` };
        }));
    });

    return chart;
}

/**
 * Build the labels for one axis of the grid.
 *
 * @param {Object} axis - COMBINED.x or COMBINED.y.
 * @param {number} count - Cells along that axis.
 * @param {function(number): number} indexOf - Value to cell index.
 * @param {boolean} vertical - Down the side rather than along the bottom.
 * @returns {HTMLElement} The axis.
 */
function buildAxis(axis, count, indexOf, vertical) {
    const element = document.createElement("div");
    element.className = vertical ? "chart-y" : "chart-x";
    element.style[vertical ? "gridTemplateRows" : "gridTemplateColumns"] =
        `repeat(${count}, 1fr)`;

    for (const value of axis.ticks) {
        const index = indexOf(value);
        const label = document.createElement("span");
        label.textContent = `${value}${axis.unit}`;

        if (vertical) {
            label.style.gridRow = index + 1;
        } else {
            label.style.gridColumn = index + 1;

            if (index === 0) label.style.justifySelf = "start";
            if (index === count - 1) label.style.justifySelf = "end";
        }

        element.append(label);
    }

    return element;
}

/**
 * Build the name of one axis
 *
 * @param {string} text - The axis name.
 * @param {boolean} vertical - Down the side rather than along the bottom.
 * @returns {HTMLElement} The title.
 */
function buildAxisTitle(text, vertical) {
    const title = document.createElement("div");
    title.className = vertical ? "chart-y-title" : "chart-x-title";
    title.textContent = text;
    return title;
}

/**
 * Score every cell of the map
 * 
 * @returns {{score: number, label: string}[]} One per cell, in the order the
 *   cells are built.
 */
function mapCells() {
    const { columns, rows: gridRows, x } = COMBINED;
    const cells = [];

    for (let row = 0; row < gridRows; row++) {
        const up = axis.max - ((axis.max - axis.min) * row) / (gridRows - 1);

        for (let column = 0; column < columns; column++) {
            const temperature = x.min + ((x.max - x.min) * column) / (columns - 1);
            const score = calculateScore(
                { ...BENIGN, temperature, ...axis.weather(up) },
                profile,
            );

            cells.push({
                score,
                label: `${Math.round(temperature)}${x.unit}, ${Math.round(up)}${axis.unit} ${axis.label.toLowerCase()}: ${score}/10`,
            });
        }
    }

    return cells;
}

/**
 * Build the control that chooses what runs up the side.
 *
 * @returns {HTMLElement} The group of axes.
 */
function buildAxisPicker() {
    const group = document.createElement("div");
    group.className = "chart-axes";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "What runs up the side");

    for (const option of AXES) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chart-axis";
        button.textContent = option.label;
        button.addEventListener("click", () => showAxis(option.key));

        axisButtons.set(option.key, button);
        group.append(button);
    }

    return group;
}

/**
 * Build the pinned chart
 *
 * @returns {HTMLElement} The chart.
 */
function buildMap() {
    const { columns, rows: gridRows, x } = COMBINED;
    const grid = buildGrid(columns, gridRows);

    const chart = document.createElement("div");
    chart.className = "chart chart-combined";
    chart.append(
        buildAxisTitle(axis.title, true),
        buildAxis(axis, gridRows, value =>
            Math.round(((axis.max - value) / (axis.max - axis.min)) * (gridRows - 1)), true),
        grid,
        buildAxis(x, columns, value =>
            Math.round(((value - x.min) / (x.max - x.min)) * (columns - 1)), false),
        buildAxisTitle(x.title, false),
        buildNote(axis.note),
    );

    paintMap = () => paintGrid(grid, mapCells());
    return chart;
}

/**
 * Draw the map against one axis, replacing whatever was there.
 *
 * @param {string} key - The axis to show.
 * @param {boolean} [remember] - Store the choice, as a rider's would be.
 */
function showAxis(key, remember = true) {
    axis = AXES.find(option => option.key === key) ?? AXES[0];

    pinnedHost.replaceChildren(buildMap());
    paintMap();

    for (const [axisKey, button] of axisButtons) {
        button.setAttribute("aria-pressed", String(axisKey === axis.key));
    }

    if (remember) writePreference(AXIS_KEY, axis.key);
}

/**
 * Build one factor's row: a header that names it and says where it sits, and a
 * body holding its sliders and its curve.
 *
 * @param {Object} factor - An entry from FACTORS.
 * @returns {HTMLElement} The row to append.
 */
function buildRow(factor) {
    const head = document.createElement("button");
    head.type = "button";
    head.className = "tune-head";
    head.id = `tune-head-${factor.key}`;
    head.setAttribute("aria-controls", `tune-body-${factor.key}`);

    const name = document.createElement("span");
    name.textContent = factor.name;

    const at = document.createElement("span");
    at.className = "tune-at";

    head.append(name, at);

    head.addEventListener("click", () => showRow(factor.key));

    const body = document.createElement("div");
    body.className = "tune-body";
    body.id = `tune-body-${factor.key}`;
    body.setAttribute("aria-labelledby", `tune-head-${factor.key}`);

    const fields = document.createElement("div");
    fields.className = "tune-fields";
    fields.append(...ownFields(factor).map(buildField));

    body.append(fields, buildSweep(factor));

    charts.push(() => {
        at.textContent = factor.at(profile);
    });

    const row = document.createElement("div");
    row.className = "tune-row";
    row.append(head, body);

    rows.set(factor.key, { factor, head, body });
    return row;
}

/**
 * Open one row and close the rest.
 *
 * @param {string} key - The factor to open.
 */
function showRow(key) {
    open = key;

    for (const [rowKey, { head, body }] of rows) {
        const expanded = rowKey === key;
        head.setAttribute("aria-expanded", String(expanded));
        body.hidden = !expanded;
    }

    resetButton.textContent = `Reset ${rows.get(key).factor.short}`;
}

/**
 * Set every body to the height of the tallest
 */
function equaliseRows() {
    if (panel.hidden) return;

    const held = panel.style.getPropertyValue("--body-height");
    panel.style.setProperty("--body-height", "auto");

    let tallest = 0;
    for (const { body } of rows.values()) {
        body.hidden = false;
        tallest = Math.max(tallest, body.offsetHeight);
    }

    for (const [key, { body }] of rows) {
        body.hidden = key !== open;
    }

    panel.style.setProperty("--body-height", tallest > 0 ? `${tallest}px` : held);
}

/**
 * Push the current profile back into the controls and the charts, so a value
 * the clamp moved is visible rather than silent.
 */
function showProfile() {
    for (const [key, { slider, value, field }] of controls) {
        slider.value = profile[key];
        value.textContent = `${profile[key]}${field.unit}`;
    }
    drawCharts();
}

/**
 * Repaint every chart
 */
export function drawCharts() {
    paintMap();
    for (const paint of charts) paint();
}

/**
 * Apply a retuned profile: show it, store it, and tell the caller.
 *
 * @param {Object} next - The profile to adopt.
 */
function adopt(next) {
    profile = next;
    showProfile();
    writeProfile(profile);
    onChange(profile);
}

/**
 * Open or leave the screen.
 *
 * @param {boolean} shown - Whether the screen should be open.
 */
function setOpen(shown) {
    toggle.setAttribute("aria-expanded", String(shown));

    for (const element of behind) {
        element.inert = shown;
    }

    if (shown) {
        panel.hidden = false;
        drawCharts();
        equaliseRows();

        requestAnimationFrame(() => {
            panel.classList.add("is-open");
            panel.focus();
        });
        return;
    }

    panel.classList.remove("is-open");

    if (panel.hidden) return;

    toggle.focus();

    if (reducedMotion.matches) {
        panel.hidden = true;
        return;
    }

    panel.addEventListener("transitionend", function done(event) {
        if (event.target !== panel || event.propertyName !== "transform") {
            return;
        }

        panel.removeEventListener("transitionend", done);

        if (!panel.classList.contains("is-open")) {
            panel.hidden = true;
        }
    });
}

/**
 * Build the panel and wire it up.
 *
 * @param {function(Object): void} handler - Called with the profile whenever
 *   it changes, so the caller can re-score what is already on screen.
 * @returns {Object} The profile to start with.
 */
export function initSettings(handler) {
    onChange = handler;

    axisHost.append(buildAxisPicker());
    rowList.append(...FACTORS.map(buildRow));

    showAxis(readPreference(AXIS_KEY, raw => raw ?? undefined, AXES[0].key), false);

    showRow(open);
    showProfile();
    setOpen(false);

    toggle.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));

    doneButton.addEventListener("click", () => setOpen(false));

    panel.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        setOpen(false);
    });

    resetButton.addEventListener("click", () => {
        adopt(resetFields(profile, ownFields(rows.get(open).factor).map(field => field.key)));
    });

    resetAllButton.addEventListener("click", () => {
        adopt(resetFields(profile, FIELDS.map(field => field.key)));
    });

    matchMedia("(prefers-color-scheme: light)").addEventListener("change", drawCharts);

    addEventListener("resize", equaliseRows);
    document.fonts?.ready.then(equaliseRows);

    return profile;
}
