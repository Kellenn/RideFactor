const arcConfig = {
    START_ANGLE: 0,
    END_ANGLE: (3 / 2) * Math.PI,
    ANIMATION_DURATION: 1000,

    WIDTH: 550,
    HEIGHT: 550,
    MARGIN: 40,
    RADIUS: Math.min(550, 550) / 2, // DRY
}

const svg = d3.select('#arc')
    .append('svg')
    .attr('width', arcConfig.WIDTH)
    .attr('height', arcConfig.HEIGHT)
    .attr('viewBox', `0 0 ${arcConfig.WIDTH} ${arcConfig.HEIGHT}`);


// Background arc (static, full arc)
const backgroundArc = d3.arc()
    .innerRadius(arcConfig.RADIUS - arcConfig.MARGIN)
    .outerRadius(arcConfig.RADIUS)
    .startAngle(arcConfig.START_ANGLE)
    .endAngle(arcConfig.END_ANGLE);

// Foreground arc (progress indicator, animated)
const foregroundArc = d3.arc()
    .innerRadius(arcConfig.RADIUS - arcConfig.MARGIN)
    .outerRadius(arcConfig.RADIUS)
    .startAngle(arcConfig.START_ANGLE)
    .endAngle(arcConfig.END_ANGLE);

// The group is translated to the center of the SVG and rotated -135°
// to position the arc as desired.
const g = svg.append('g')
    .attr('transform', `translate(${arcConfig.WIDTH / 2}, ${arcConfig.HEIGHT / 2}) rotate(-135)`);

const background = g.append('path')
    .attr('d', backgroundArc)
    .attr('fill', '#444');

const foreground = g.append('path');

// Main score text displayed at the center
const scoreText = g.append('text')
    .attr('fill', 'white')
    .style('opacity', 0) // Initially hidden; will fade in
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '5rem')
    // Apply a counter-rotation to keep the text upright.
    .attr('transform', 'rotate(135)');
    
// Subtext displayed below the main score text (e.g., description)
const subText = g.append('text')
    .style('opacity', 0) // Initially hidden; will fade in
    .attr('text-anchor', 'middle')
    // dy shifts the subtext downward relative to its default position.
    .attr('dy', '8.5em')
    .style('font-size', '1.5rem')
    .attr('transform', 'rotate(135)');

// Maps score values [0, 5, 10] to a color range from red to yellow to green.
const colorInterpolator = d3.scaleLinear()
    .domain([0, 5, 10])
    .range(["red", "yellow", "green"]);

/**
 * Animates the arc and updates the score text and subtext.
 *
 * @param {Object} scoreResult - An object with:
 *   - average: The numerical score (0 to 10)
 *   - description: A text description for the score
 */
function animate(scoreResult) {
    const score = scoreResult.average;

    // Create an interpolator that transitions from 0 to the fractional value (score/10).
    const interpolator = d3.interpolate(0, score / 10);

    // Update the text elements with the current score and its description.
    scoreText.text(score);
    subText.text(scoreResult.description);

    // Determine the fill color based on the score.
    const fillColor = colorInterpolator(score);
    subText.attr("fill", fillColor);
    foreground.attr("fill", fillColor);

    // Animate the opacity of the text elements for a fade-in effect.
    scoreText.transition()
        .duration(arcConfig.ANIMATION_DURATION)
        .style("opacity", 1);

    subText.transition()
        .duration(arcConfig.ANIMATION_DURATION)
        .style("opacity", 1);

    // Animate the foreground arc to reflect the current score.
    foreground.transition()
        .duration(arcConfig.ANIMATION_DURATION)
        .attrTween('d', function () {
            return function (t) {
                // Update the arc's end angle according to the interpolation.
                foregroundArc.endAngle(interpolator(t) * arcConfig.END_ANGLE);
                return foregroundArc();
            };
        });
}

/**
 * Reset all elements to the initial state.
 */
function reset() {
    const temperatureElement = document.querySelector("#temperature");
    const precipitationElement = document.querySelector("#precipitation");
    const windElement = document.querySelector("#wind");
    const daytimeElement = document.querySelector("#daytime");
    const arcLoadingSvg = document.querySelector("#arc")

    // Reset text elements and background image
    temperatureElement.textContent = "Temperature: ";
    precipitationElement.textContent = "Precipitation: ";
    windElement.textContent = "Wind: ";
    daytimeElement.textContent = "Daytime: ";
    arcLoadingSvg.style.backgroundImage = '';

    // Reset foreground color
    foreground
        .attr("fill", "#444");

    // Reset score text
    scoreText.text('');
    subText.text('');
}
