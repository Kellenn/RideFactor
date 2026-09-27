import { scoreColor } from "./color.js";

/**
 * Build a bar chart, one bar per sample.
 *
 * @param {number} count - Number of bars.
 * @returns {HTMLElement} The chart, ready to paint.
 */
export function buildBars(count) {
    const chart = document.createElement("div");
    chart.className = "chart-bars";
    chart.setAttribute("aria-hidden", "true");

    for (let i = 0; i < count; i++) {
        const bar = document.createElement("i");
        bar.style.setProperty("--i", i);

        chart.append(bar);
    }

    return chart;
}

/**
 * Paint a bar chart.
 *
 * @param {HTMLElement} chart - A chart from buildBars.
 * @param {{score: number, label: string}[]} samples - One entry per bar.
 */
export function paintBars(chart, samples) {
    samples.forEach(({ score, label }, i) => {
        const bar = chart.children[i];
        bar.style.background = scoreColor(score);
        bar.style.height = `${20 + score * 8}%`;
        bar.title = label;
    });
}

/**
 * Build a grid chart, read left to right and top to bottom.
 *
 * @param {number} columns - Cells across.
 * @param {number} rows - Cells down.
 * @returns {HTMLElement} The chart, ready to paint.
 */
export function buildGrid(columns, rows) {
    const chart = document.createElement("div");
    chart.className = "chart-grid";
    chart.setAttribute("aria-hidden", "true");
    chart.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    for (let i = 0; i < columns * rows; i++) {
        const cell = document.createElement("i");
        cell.style.setProperty("--i", i);
        
        chart.append(cell);
    }

    return chart;
}

/**
 * Paint a grid chart.
 *
 *
 * @param {HTMLElement} chart - A chart from buildGrid.
 * @param {{score: number, label: string}[]} samples - One entry per cell, in
 *   the order the cells were built.
 */
export function paintGrid(chart, samples) {
    samples.forEach(({ score, label }, i) => {
        const cell = chart.children[i];
        cell.style.background = scoreColor(score);
        cell.style.opacity = 0.32 + (score / 10) * 0.68;
        cell.title = label;
    });
}
