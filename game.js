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
    discoveredColors: new Set(['255,0,0', '255,255,0', '0,0,255']) // Primary colors
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
    colorsContainer: document.getElementById('colors-container'),
    colorBtns: null // Will be set dynamically
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
 * Mix two colors together using RGB averaging
 * This produces a subtractive-like mixing effect similar to paint mixing
 * @param {number[]} color1 - First color [r, g, b]
 * @param {number[]} color2 - Second color [r, g, b]
 * @returns {number[]} Mixed color [r, g, b]
 */
function mixColors(color1, color2) {
    return [
        Math.round((color1[0] + color2[0]) / 2),
        Math.round((color1[1] + color2[1]) / 2),
        Math.round((color1[2] + color2[2]) / 2)
    ];
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
 * Handle color button click
 * @param {Event} event - Click event
 */
function handleColorClick(event) {
    const colorStr = event.target.dataset.color;
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
    
    // Check if this is a new color and add it to the palette
    if (!gameState.discoveredColors.has(colorKey)) {
        addColorToPalette(mixed, colorKey);
    }
    
    updateUI();
}

/**
 * Add a new discovered color to the palette
 * @param {number[]} color - Color array [r, g, b]
 * @param {string} colorKey - Color key string "r,g,b"
 */
function addColorToPalette(color, colorKey) {
    gameState.discoveredColors.add(colorKey);
    
    const newBtn = document.createElement('button');
    newBtn.className = 'color-btn new-color';
    newBtn.dataset.color = colorKey;
    newBtn.style.backgroundColor = rgbToString(color);
    newBtn.title = `Mixed Color (${colorKey})`;
    newBtn.addEventListener('click', handleColorClick);
    
    elements.colorsContainer.appendChild(newBtn);
    
    // Remove animation class after it completes
    setTimeout(() => {
        newBtn.classList.remove('new-color');
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
        // Blend the new color with the crab's current color
        const newCrabColor = mixColors(gameState.crabColor, feedColor);
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
    // Get color buttons (dynamic)
    elements.colorBtns = document.querySelectorAll('.color-btn');
    
    // Add event listeners to color buttons
    elements.colorBtns.forEach(btn => {
        btn.addEventListener('click', handleColorClick);
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
