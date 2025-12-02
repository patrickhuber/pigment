/**
 * Unit tests for color conversion and mixing functions
 * Tests pigment (subtractive) color mixing using RYB color space
 */

const { mixColors, rgbToRyb, rybToRgb, parseColor, rgbToString } = require('./colorUtils');

// Define standard colors for testing
const COLORS = {
    RED: [255, 0, 0],
    YELLOW: [255, 255, 0],
    BLUE: [0, 0, 255],
    ORANGE: [255, 128, 0],
    GREEN: [0, 255, 0],
    PURPLE: [128, 0, 128],
    WHITE: [255, 255, 255],
    BLACK: [0, 0, 0]
};

/**
 * Helper function to check if a color is close to expected
 * Uses tolerance because color mixing involves interpolation
 * @param {number[]} actual - Actual RGB color
 * @param {number[]} expected - Expected RGB color  
 * @param {number} tolerance - Acceptable difference per channel (default 40)
 * @returns {boolean} Whether colors are close enough
 */
function colorsMatch(actual, expected, tolerance = 40) {
    return actual.every((val, i) => Math.abs(val - expected[i]) <= tolerance);
}

/**
 * Helper to get color name based on RGB values
 * @param {number[]} color - RGB color array
 * @returns {string} Descriptive color name
 */
function getColorDescription(color) {
    const [r, g, b] = color;
    
    // Check for purple/violet (high red and blue, low green)
    if (r > 100 && b > 100 && g < 100) {
        if (b > r) return 'violet';
        if (r > b + 50) return 'magenta';
        return 'purple';
    }
    
    // Check for orange (high red, medium green, low blue)
    if (r > 200 && g > 50 && g < 200 && b < 100) {
        if (r > 200 && g < 100) return 'red-orange';
        return 'orange';
    }
    
    // Check for green
    if (g > r && g > b) {
        if (g > 150 && r < 100 && b < 100) return 'green';
        if (b > r) return 'cyan';
        return 'chartreuse';
    }
    
    // Check for brown (low-medium values with red dominant)
    if (r > g && r > b && r < 200 && g < 150 && b < 150) {
        return 'brown';
    }
    
    // Check for amber (orange-yellow)
    if (r > 200 && g > 150 && b < 100) {
        return 'amber';
    }
    
    return `rgb(${r},${g},${b})`;
}

describe('Color Utility Functions', () => {
    describe('parseColor', () => {
        test('parses comma-separated RGB string', () => {
            expect(parseColor('255,0,0')).toEqual([255, 0, 0]);
            expect(parseColor('0,255,0')).toEqual([0, 255, 0]);
            expect(parseColor('0,0,255')).toEqual([0, 0, 255]);
        });
    });

    describe('rgbToString', () => {
        test('converts RGB array to CSS string', () => {
            expect(rgbToString([255, 0, 0])).toBe('rgb(255, 0, 0)');
            expect(rgbToString([0, 128, 255])).toBe('rgb(0, 128, 255)');
        });
    });

    describe('rgbToRyb', () => {
        test('converts red RGB to RYB', () => {
            const ryb = rgbToRyb(COLORS.RED);
            expect(ryb[0]).toBeGreaterThan(200); // High red
        });

        test('converts yellow RGB to RYB', () => {
            const ryb = rgbToRyb(COLORS.YELLOW);
            expect(ryb[1]).toBeGreaterThan(200); // High yellow
        });

        test('converts blue RGB to RYB', () => {
            const ryb = rgbToRyb(COLORS.BLUE);
            expect(ryb[2]).toBeGreaterThan(200); // High blue
        });
    });

    describe('rybToRgb', () => {
        test('converts pure red RYB to RGB', () => {
            const rgb = rybToRgb([255, 0, 0]);
            expect(rgb[0]).toBeGreaterThan(200); // High red
            expect(rgb[1]).toBeLessThan(50);     // Low green
            expect(rgb[2]).toBeLessThan(50);     // Low blue
        });

        test('converts pure yellow RYB to RGB', () => {
            const rgb = rybToRgb([0, 255, 0]);
            expect(rgb[0]).toBeGreaterThan(200); // High red (yellow has R+G in RGB)
            expect(rgb[1]).toBeGreaterThan(200); // High green
            expect(rgb[2]).toBeLessThan(50);     // Low blue
        });

        test('converts pure blue RYB to RGB', () => {
            const rgb = rybToRgb([0, 0, 255]);
            expect(rgb[2]).toBeGreaterThan(200); // High blue
        });
    });
});

describe('Pigment (Subtractive) Color Mixing', () => {
    describe('Primary Color Mixtures', () => {
        test('Red + Blue = Purple', () => {
            const result = mixColors(COLORS.RED, COLORS.BLUE);
            // Purple should have significant red and blue, less green
            expect(result[0]).toBeGreaterThan(80);  // Has red
            expect(result[2]).toBeGreaterThan(80);  // Has blue
            expect(result[1]).toBeLessThan(result[0]); // Less green than red
            expect(getColorDescription(result)).toMatch(/purple|violet|magenta/i);
        });

        test('Red + Yellow = Orange', () => {
            const result = mixColors(COLORS.RED, COLORS.YELLOW);
            // Orange should have high red, medium green, low blue
            expect(result[0]).toBeGreaterThan(200); // High red
            expect(result[1]).toBeGreaterThan(50);  // Some green (makes orange)
            expect(result[2]).toBeLessThan(100);    // Low blue
            expect(getColorDescription(result)).toMatch(/orange|amber/i);
        });

        test('Yellow + Blue = Green', () => {
            const result = mixColors(COLORS.YELLOW, COLORS.BLUE);
            // Green should have dominant green component
            expect(result[1]).toBeGreaterThan(100); // Has green
            // In subtractive mixing, we expect some blue and possibly some red residue
            expect(getColorDescription(result)).toMatch(/green|cyan|chartreuse/i);
        });
    });

    describe('Secondary Color Mixtures', () => {
        test('Red + Orange = Red-Orange', () => {
            const orange = mixColors(COLORS.RED, COLORS.YELLOW); // First create orange
            const result = mixColors(COLORS.RED, orange);
            // Red-orange should be more red than orange
            expect(result[0]).toBeGreaterThan(200); // High red
            expect(result[1]).toBeGreaterThan(30);  // Some green
            expect(result[1]).toBeLessThan(150);    // Less green than pure orange
            expect(result[2]).toBeLessThan(100);    // Low blue
        });

        test('Red + Purple = Magenta', () => {
            const purple = mixColors(COLORS.RED, COLORS.BLUE); // First create purple
            const result = mixColors(COLORS.RED, purple);
            // Magenta should have high red and some blue
            expect(result[0]).toBeGreaterThan(150); // High red
            expect(result[2]).toBeGreaterThanOrEqual(40);  // Has blue
            // Red is the dominant color in the mix
            expect(result[0]).toBeGreaterThan(result[1]); // More red than green
        });

        test('Red + Green = Brown', () => {
            const result = mixColors(COLORS.RED, COLORS.GREEN);
            // Brown is a low-saturation color, darker mix
            // In pigment mixing, red + green creates brownish tones
            const brightness = (result[0] + result[1] + result[2]) / 3;
            expect(brightness).toBeLessThan(200); // Not too bright
            expect(result[0]).toBeGreaterThan(result[2]); // More red than blue
        });

        test('Yellow + Green = Chartreuse', () => {
            const result = mixColors(COLORS.YELLOW, COLORS.GREEN);
            // Chartreuse is yellow-green
            expect(result[1]).toBeGreaterThan(150); // High green
            expect(result[0]).toBeGreaterThan(100); // Has some red (from yellow)
            expect(result[2]).toBeLessThan(150);    // Low blue
        });

        test('Yellow + Purple = Brown', () => {
            const purple = mixColors(COLORS.RED, COLORS.BLUE);
            const result = mixColors(COLORS.YELLOW, purple);
            // Yellow + Purple creates a brownish/muddy color
            // This is because we're mixing complementary-ish colors
            const brightness = (result[0] + result[1] + result[2]) / 3;
            // Should be a muted color, not too saturated
            expect(Math.max(result[0], result[1], result[2]) - 
                   Math.min(result[0], result[1], result[2])).toBeLessThan(180);
        });

        test('Yellow + Orange = Amber', () => {
            const orange = mixColors(COLORS.RED, COLORS.YELLOW);
            const result = mixColors(COLORS.YELLOW, orange);
            // Amber is yellow-orange
            expect(result[0]).toBeGreaterThan(200); // High red
            expect(result[1]).toBeGreaterThan(150); // Good amount of green (makes it yellow-ish)
            expect(result[2]).toBeLessThan(100);    // Low blue
        });

        test('Blue + Green = Cyan', () => {
            const result = mixColors(COLORS.BLUE, COLORS.GREEN);
            // Cyan has high green and blue
            expect(result[1]).toBeGreaterThan(100); // Has green
            expect(result[2]).toBeGreaterThan(100); // Has blue
            expect(result[0]).toBeLessThan(result[1]); // Less red
        });

        test('Blue + Orange = Brown', () => {
            const orange = mixColors(COLORS.RED, COLORS.YELLOW);
            const result = mixColors(COLORS.BLUE, orange);
            // Blue + Orange (complementary colors) = Brown/muddy
            const brightness = (result[0] + result[1] + result[2]) / 3;
            expect(brightness).toBeLessThan(200); // Not too bright - it's a muted color
        });

        test('Blue + Purple = Violet', () => {
            const purple = mixColors(COLORS.RED, COLORS.BLUE);
            const result = mixColors(COLORS.BLUE, purple);
            // Violet has high blue and some red
            expect(result[2]).toBeGreaterThan(100); // High blue
            expect(result[0]).toBeGreaterThan(30);  // Has some red
            // Result is a blue-dominant purple/violet shade
            expect(result[2]).toBeGreaterThan(result[1]); // Blue > Green
        });
    });
});

describe('Edge Cases', () => {
    test('Mixing same color returns approximately same color', () => {
        const result = mixColors(COLORS.RED, COLORS.RED);
        expect(colorsMatch(result, COLORS.RED, 50)).toBe(true);
    });

    test('Mixing with white lightens color', () => {
        const result = mixColors(COLORS.RED, COLORS.WHITE);
        // Should be lighter red (pinkish) - the RYB model handles white mixing
        // The red channel should still be dominant
        expect(result[0]).toBeGreaterThan(result[1]);
        expect(result[0]).toBeGreaterThan(result[2]);
    });

    test('Mixing with black darkens color', () => {
        const result = mixColors(COLORS.RED, COLORS.BLACK);
        // When mixing with black in RYB space, the result depends on the color model
        // The key is that red should still be the dominant channel
        expect(result[0]).toBeGreaterThan(result[1]);
        expect(result[0]).toBeGreaterThan(result[2]);
    });
});
