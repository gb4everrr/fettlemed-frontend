// src/lib/colorUtils.ts

/**
 * Adjusts a hex color by a specific percentage (positive for lighter, negative for darker)
 * @param color Hex code (e.g., #2D5367)
 * @param amount Amount to adjust (-255 to 255)
 */
export const adjustColorBrightness = (color: string, amount: number): string => {
    let usePound = false;
    if (color[0] === "#") {
        color = color.slice(1);
        usePound = true;
    }
    const num = parseInt(color, 16);
    let r = (num >> 16) + amount;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amount;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amount;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

/**
 * Generates a full CSS variable palette based on a single primary brand color.
 * Includes text, backgrounds, and borders derived from the primary hue.
 */
export const generatePalette = (primaryHex: string) => {
    return {
        // --- Brand Colors ---
        '--color-primary-brand': primaryHex,
        // Slightly lighter for hover states
        '--color-primary-light': adjustColorBrightness(primaryHex, 20),
        // Darker for active/pressed states
        '--color-secondary-brand': adjustColorBrightness(primaryHex, -20),
        // Slightly darker for secondary accents
        '--color-secondary-light': adjustColorBrightness(primaryHex, -10),

        // --- Text Palette (Derived from Brand) ---
        // Main text uses the brand color for deep integration
        '--color-text-primary': adjustColorBrightness(primaryHex, -10),
        // Secondary text is slightly darker/muted
        '--color-text-secondary': adjustColorBrightness(primaryHex, -10),
        // Muted text is significantly darker to recede
        '--color-text-muted': adjustColorBrightness(primaryHex, -30),

        // --- Backgrounds & Surfaces (High Brightness Tints) ---
        // Background is a very faint tint of the brand (nearly white)
        '--color-background': adjustColorBrightness(primaryHex, 250),
        // Surface is slightly darker than background to pop cards
        '--color-surface': adjustColorBrightness(primaryHex, 250),

        // --- Borders ---
        // Subtle border
        '--color-border': adjustColorBrightness(primaryHex, 100),
        // Focus border is brighter/more intense (similar to primary light)
        '--color-border-focus': adjustColorBrightness(primaryHex, 0),

        '--color-text-dark': adjustColorBrightness(primaryHex, -25)
    };
};