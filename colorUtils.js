/**
 * Color Utilities for Pigment Factory
 * Handles RYB (subtractive/pigment) color mixing
 */

/**
 * Trilinear interpolation helper for RYB/RGB conversion
 * @param {number} t - Interpolation factor (0-1)
 * @param {number} a - First value
 * @param {number} b - Second value
 * @returns {number} Interpolated value
 */
function cubicInt(t, a, b) {
    const weight = t * t * (3 - 2 * t);
    return a + weight * (b - a);
}

/**
 * Interpolate a single color component using trilinear interpolation
 * This maps artistic RYB color mixing to RGB display colors
 * @param {number} iR - Red factor (0-1)
 * @param {number} iY - Yellow factor (0-1) 
 * @param {number} iB - Blue factor (0-1)
 * @param {number[][]} colors - Array of 8 RGB corner colors
 * @param {number} component - Color component index (0=R, 1=G, 2=B)
 * @returns {number} Interpolated color component value
 */
function interpolateComponent(iR, iY, iB, colors, component) {
    const x0 = cubicInt(iB, colors[0][component], colors[1][component]);
    const x1 = cubicInt(iB, colors[2][component], colors[3][component]);
    const x2 = cubicInt(iB, colors[4][component], colors[5][component]);
    const x3 = cubicInt(iB, colors[6][component], colors[7][component]);
    const y0 = cubicInt(iY, x0, x1);
    const y1 = cubicInt(iY, x2, x3);
    return cubicInt(iR, y0, y1);
}

/**
 * Convert RYB color to RGB color space using trilinear interpolation
 * Maps artistic color mixing (RYB) to display colors (RGB)
 * @param {number[]} ryb - RYB color [r, y, b] (0-255 each)
 * @returns {number[]} RGB color [r, g, b]
 */
function rybToRgb(ryb) {
    // RYB cube corners mapped to RGB values
    // These define how RYB colors map to RGB for artistic color mixing
    const COLORS = [
        [255, 255, 255], // white (no color)
        [0, 0, 255],     // blue
        [255, 255, 0],   // yellow
        [0, 255, 0],     // green (yellow + blue)
        [255, 0, 0],     // red
        [128, 0, 128],   // purple (red + blue)
        [255, 128, 0],   // orange (red + yellow)
        [0, 0, 0]        // black (all colors)
    ];
    
    const r = ryb[0] / 255;
    const y = ryb[1] / 255;
    const b = ryb[2] / 255;
    
    const outR = interpolateComponent(r, y, b, COLORS, 0);
    const outG = interpolateComponent(r, y, b, COLORS, 1);
    const outB = interpolateComponent(r, y, b, COLORS, 2);
    
    return [
        Math.round(Math.min(255, Math.max(0, outR))),
        Math.round(Math.min(255, Math.max(0, outG))),
        Math.round(Math.min(255, Math.max(0, outB)))
    ];
}

/**
 * Convert RGB color to RYB color space
 * This is an approximation for mixing purposes
 * @param {number[]} rgb - RGB color [r, g, b]
 * @returns {number[]} RYB color [r, y, b]
 */
function rgbToRyb(rgb) {
    let r = rgb[0];
    let g = rgb[1];
    let b = rgb[2];
    
    // Remove whiteness from the color
    const white = Math.min(r, g, b);
    r -= white;
    g -= white;
    b -= white;
    
    const maxG = Math.max(r, g, b);
    
    // Get yellow out of red+green
    let y = Math.min(r, g);
    r -= y;
    g -= y;
    
    // If blue and green, cut both in half to make blue
    if (b > 0 && g > 0) {
        b = Math.floor(b / 2);
        g = Math.floor(g / 2);
    }
    
    // Redistribute remaining green: in RYB, green contributes to both yellow and blue
    y += g;
    b += g;
    
    // Normalize to max value
    const maxRYB = Math.max(r, y, b);
    if (maxRYB > 0) {
        const factor = maxG / maxRYB;
        r = Math.round(r * factor);
        y = Math.round(y * factor);
        b = Math.round(b * factor);
    }
    
    // Add whiteness back
    r += white;
    y += white;
    b += white;
    
    return [r, y, b];
}

/**
 * Mix two colors together using RYB (artistic/pigment) color mixing simulation
 * This simulates traditional paint mixing where blue + yellow = green
 * @param {number[]} color1 - First color [r, g, b]
 * @param {number[]} color2 - Second color [r, g, b]
 * @returns {number[]} Mixed color [r, g, b]
 */
function mixColors(color1, color2) {
    // Convert RGB to RYB for artistic color mixing
    const ryb1 = rgbToRyb(color1);
    const ryb2 = rgbToRyb(color2);
    
    // Mix in RYB space by averaging
    const mixedRyb = [
        Math.round((ryb1[0] + ryb2[0]) / 2),
        Math.round((ryb1[1] + ryb2[1]) / 2),
        Math.round((ryb1[2] + ryb2[2]) / 2)
    ];
    
    // Convert back to RGB
    return rybToRgb(mixedRyb);
}

/**
 * Parse color string "r,g,b" to array [r, g, b]
 * @param {string} colorStr - Color string in format "r,g,b"
 * @returns {number[]} Array of RGB values
 */
function parseColor(colorStr) {
    return colorStr.split(',').map(Number);
}

/**
 * Convert RGB array to CSS rgb() string
 * @param {number[]} colorArray - Array of RGB values [r, g, b]
 * @returns {string} CSS rgb() string
 */
function rgbToString(colorArray) {
    return `rgb(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]})`;
}

// Export for Node.js/Jest testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mixColors,
        rgbToRyb,
        rybToRgb,
        parseColor,
        rgbToString,
        cubicInt,
        interpolateComponent
    };
}
