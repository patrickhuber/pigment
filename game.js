/**
 * Pigment Factory - Color Mixing Game
 * A game where you mix colors in a factory and feed them to a crab
 */

// Game State
const gameState = {
    slot1Color: null,
    slot2Color: null,
    resultColor: null,
    crabColor: [245, 245, 245], // Default white color
    selectedSlot: 1,
    discoveredColors: new Set(['255,0,0', '255,255,0', '0,0,255']), // Primary colors (active in palette)
    inventoryFactories: new Set() // Factories waiting to be placed
};

// DOM Elements
const elements = {
    slot1: document.getElementById('slot1'),
    slot2: document.getElementById('slot2'),
    result: document.getElementById('result'),
    mixBtn: document.getElementById('mix-btn'),
    clearBtn: document.getElementById('clear-btn'),
    feedBtn: document.getElementById('feed-btn'),
    crab: document.getElementById('crab'),
    crabStatus: document.getElementById('crab-status'),
    crabMouth: document.getElementById('crab-mouth'),
    foodPellet: document.getElementById('food-pellet'),
    outputPipe: document.getElementById('output-pipe'),
    outputColorValue: document.getElementById('output-color-value'),
    factoriesContainer: document.getElementById('factories-container'),
    inventoryItems: document.getElementById('inventory-items'),
    colorFactories: null // Will be set dynamically
};

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

/**
 * Mix two colors together using RYB (artistic) color mixing simulation
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
 * Fill a slot with a color
 * @param {number} slotNum - Slot number (1 or 2)
 * @param {number[]} color - Color array [r, g, b]
 */
function fillSlot(slotNum, color) {
    const slot = slotNum === 1 ? elements.slot1 : elements.slot2;
    
    if (slotNum === 1) {
        gameState.slot1Color = color;
    } else {
        gameState.slot2Color = color;
    }
    
    slot.style.backgroundColor = rgbToString(color);
    slot.classList.add('filled');
    
    // Move to next slot
    if (slotNum === 1 && !gameState.slot2Color) {
        gameState.selectedSlot = 2;
    }
    
    updateUI();
}

/**
 * Handle color factory click
 * @param {Event} event - Click event
 */
function handleFactoryClick(event) {
    const factory = event.target.closest('.color-factory');
    if (!factory) return;
    
    const colorStr = factory.dataset.color;
    const color = parseColor(colorStr);
    
    // Fill the appropriate slot
    if (!gameState.slot1Color) {
        fillSlot(1, color);
    } else if (!gameState.slot2Color) {
        fillSlot(2, color);
    } else {
        // Both slots full, replace slot 1 and clear slot 2
        clearFactory();
        fillSlot(1, color);
    }
}

/**
 * Mix the colors in the factory
 */
function mixFactoryColors() {
    if (!gameState.slot1Color || !gameState.slot2Color) {
        return;
    }
    
    const mixed = mixColors(gameState.slot1Color, gameState.slot2Color);
    gameState.resultColor = mixed;
    
    elements.result.style.backgroundColor = rgbToString(mixed);
    elements.result.classList.add('has-result');
    
    // Display the output color value
    const colorKey = `${mixed[0]},${mixed[1]},${mixed[2]}`;
    if (elements.outputColorValue) {
        elements.outputColorValue.textContent = `RGB(${colorKey})`;
    }
    
    // Show the output pipe with factory animation
    if (elements.outputPipe) {
        elements.outputPipe.classList.add('active');
    }
    
    // Check if this is a new color and add a factory to inventory
    if (!gameState.discoveredColors.has(colorKey) && !gameState.inventoryFactories.has(colorKey)) {
        addFactoryToInventory(mixed, colorKey);
    }
    
    updateUI();
}

/**
 * Add a new factory to the inventory
 * @param {number[]} color - Color array [r, g, b]
 * @param {string} colorKey - Color key string "r,g,b"
 */
function addFactoryToInventory(color, colorKey) {
    gameState.inventoryFactories.add(colorKey);
    
    // Clear empty inventory message
    const emptyMsg = elements.inventoryItems.querySelector('.empty-inventory');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    const newFactory = document.createElement('div');
    newFactory.className = 'inventory-factory new-factory';
    newFactory.dataset.color = colorKey;
    newFactory.title = `Mixed Color Factory (${colorKey})`;
    newFactory.innerHTML = `
        <div class="mini-factory-building" style="--factory-color: ${rgbToString(color)};">
            <div class="mini-chimney">
                <div class="mini-smoke"></div>
            </div>
            <div class="mini-factory-body"></div>
            <div class="mini-color-output"></div>
        </div>
        <span class="factory-label">Mixed</span>
        <span class="place-hint">Click to place</span>
    `;
    newFactory.addEventListener('click', handleInventoryFactoryClick);
    
    elements.inventoryItems.appendChild(newFactory);
    
    // Remove animation class after it completes
    setTimeout(() => {
        newFactory.classList.remove('new-factory');
    }, 500);
}

/**
 * Handle click on inventory factory to place it in the palette
 * @param {Event} event - Click event
 */
function handleInventoryFactoryClick(event) {
    const inventoryFactory = event.target.closest('.inventory-factory');
    if (!inventoryFactory) return;
    
    const colorKey = inventoryFactory.dataset.color;
    const color = parseColor(colorKey);
    
    // Add to discovered colors
    gameState.discoveredColors.add(colorKey);
    
    // Remove from inventory
    gameState.inventoryFactories.delete(colorKey);
    
    // Remove from DOM
    inventoryFactory.remove();
    
    // Show empty message if inventory is empty
    if (gameState.inventoryFactories.size === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-inventory';
        emptyMsg.textContent = 'No factories yet. Mix some colors!';
        elements.inventoryItems.appendChild(emptyMsg);
    }
    
    // Add to palette
    addFactoryToPalette(color, colorKey);
}

/**
 * Add a factory to the palette
 * @param {number[]} color - Color array [r, g, b]
 * @param {string} colorKey - Color key string "r,g,b"
 */
function addFactoryToPalette(color, colorKey) {
    const newFactory = document.createElement('div');
    newFactory.className = 'color-factory new-factory';
    newFactory.dataset.color = colorKey;
    newFactory.title = `Mixed Color Factory (${colorKey})`;
    newFactory.innerHTML = `
        <div class="mini-factory-building" style="--factory-color: ${rgbToString(color)};">
            <div class="mini-chimney">
                <div class="mini-smoke"></div>
            </div>
            <div class="mini-factory-body"></div>
            <div class="mini-color-output"></div>
        </div>
        <span class="factory-label">Mixed</span>
    `;
    newFactory.addEventListener('click', handleFactoryClick);
    
    elements.factoriesContainer.appendChild(newFactory);
    
    // Remove animation class after it completes
    setTimeout(() => {
        newFactory.classList.remove('new-factory');
    }, 500);
}

/**
 * Clear the factory slots
 */
function clearFactory() {
    gameState.slot1Color = null;
    gameState.slot2Color = null;
    gameState.resultColor = null;
    gameState.selectedSlot = 1;
    
    elements.slot1.style.backgroundColor = '';
    elements.slot2.style.backgroundColor = '';
    elements.result.style.backgroundColor = '';
    
    elements.slot1.classList.remove('filled');
    elements.slot2.classList.remove('filled');
    elements.result.classList.remove('has-result');
    
    // Clear output color value
    if (elements.outputColorValue) {
        elements.outputColorValue.textContent = '';
    }
    
    // Hide output pipe
    if (elements.outputPipe) {
        elements.outputPipe.classList.remove('active', 'flowing');
    }
    
    updateUI();
}

/**
 * Feed the crab with the mixed pigment
 */
function feedCrab() {
    if (!gameState.resultColor) {
        return;
    }
    
    const feedColor = gameState.resultColor;
    const colorString = rgbToString(feedColor);
    
    // Start food pellet animation
    if (elements.foodPellet) {
        elements.foodPellet.style.backgroundColor = colorString;
        elements.foodPellet.classList.add('falling');
    }
    
    // Start output pipe flowing animation
    if (elements.outputPipe) {
        elements.outputPipe.classList.add('flowing');
    }
    
    // Start crab eating animation
    elements.crab.classList.add('eating');
    if (elements.crabMouth) {
        elements.crabMouth.classList.add('eating');
    }
    
    // After food reaches crab, change color
    setTimeout(() => {
        // Apply the exact mixed color to the crab (no blending with previous color)
        const newCrabColor = feedColor;
        gameState.crabColor = newCrabColor;
        
        // Change crab color
        const newColorString = rgbToString(newCrabColor);
        const crabBody = elements.crab.querySelector('.crab-body');
        const claws = elements.crab.querySelectorAll('.claw');
        const legs = elements.crab.querySelectorAll('.leg');
        
        crabBody.style.backgroundColor = newColorString;
        claws.forEach(claw => {
            claw.style.backgroundColor = newColorString;
        });
        legs.forEach(leg => {
            leg.style.backgroundColor = newColorString;
        });
        
        // Add color change animation
        elements.crab.classList.add('feeding', 'color-change');
        
        // Update status
        updateCrabStatus(newCrabColor);
    }, 600);
    
    // Clear the result
    gameState.resultColor = null;
    elements.result.style.backgroundColor = '';
    elements.result.classList.remove('has-result');
    
    // Clear output color value
    if (elements.outputColorValue) {
        elements.outputColorValue.textContent = '';
    }
    
    // Hide output pipe
    if (elements.outputPipe) {
        elements.outputPipe.classList.remove('active');
    }
    
    // Remove animation classes after animation completes
    setTimeout(() => {
        elements.crab.classList.remove('feeding', 'color-change', 'eating');
        if (elements.crabMouth) {
            elements.crabMouth.classList.remove('eating');
        }
        if (elements.foodPellet) {
            elements.foodPellet.classList.remove('falling');
        }
        if (elements.outputPipe) {
            elements.outputPipe.classList.remove('flowing');
        }
    }, 1200);
    
    updateUI();
}

/**
 * Update the crab's status message based on its color
 * @param {number[]} color - Current crab color [r, g, b]
 */
function updateCrabStatus(color) {
    const [r, g, b] = color;
    let message = '';
    
    // Determine dominant color and generate message
    const max = Math.max(r, g, b);
    const brightness = (r + g + b) / 3;
    
    if (brightness > 200) {
        message = "The crab is glowing so bright! It looks happy! ✨";
    } else if (brightness < 80) {
        message = "The crab has gone quite dark... mysterious! 🌙";
    } else if (r === max && r > 150) {
        message = "The crab is feeling fiery and warm! 🔥";
    } else if (g === max && g > 150) {
        message = "The crab is feeling natural and earthy! 🌿";
    } else if (b === max && b > 150) {
        message = "The crab is feeling cool and calm! 🌊";
    } else if (r > 150 && g > 150) {
        message = "The crab is looking golden and sunny! ☀️";
    } else if (r > 150 && b > 150) {
        message = "The crab is looking magical and mystical! 💜";
    } else if (g > 150 && b > 150) {
        message = "The crab is looking fresh and aquatic! 🐠";
    } else {
        message = "The crab seems content with its new color! 🦀";
    }
    
    elements.crabStatus.textContent = message;
}

/**
 * Update UI state (button enabling/disabling)
 */
function updateUI() {
    // Mix button enabled when both slots have colors
    elements.mixBtn.disabled = !(gameState.slot1Color && gameState.slot2Color);
    
    // Feed button enabled when there's a result
    elements.feedBtn.disabled = !gameState.resultColor;
}

/**
 * Initialize the game
 */
function initGame() {
    // Get color factory elements (dynamic)
    elements.colorFactories = document.querySelectorAll('.color-factory');
    
    // Add event listeners to color factories
    elements.colorFactories.forEach(factory => {
        factory.addEventListener('click', handleFactoryClick);
    });
    
    // Add event listeners to action buttons
    elements.mixBtn.addEventListener('click', mixFactoryColors);
    elements.clearBtn.addEventListener('click', clearFactory);
    elements.feedBtn.addEventListener('click', feedCrab);
    
    // Initial UI state
    updateUI();
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);
