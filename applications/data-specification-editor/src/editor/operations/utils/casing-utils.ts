import { CASINGS } from "../context/operation-context";

/**
 * Applies a casing convention to an existing technical label.
 * This preserves the content/words of the label but applies the specified casing style.
 * 
 * @param label The existing technical label
 * @param targetCasing The target casing convention to apply
 * @returns The label with the new casing applied
 */
export function applyCasingToLabel(
    label: string,
    targetCasing: typeof CASINGS[number]
): string {
    if (!label) return label;

    // Parse the existing label to extract words, handling various formats
    const words = parseWordsFromLabel(label);
    
    if (words.length === 0) return label;

    // Apply the target casing
    switch (targetCasing) {
        case "snake_case":
            return words.map(w => w.toLowerCase()).join("_");
        case "kebab-case":
            return words.map(w => w.toLowerCase()).join("-");
        case "camelCase":
            return words.map((w, index) => 
                index === 0 
                    ? w.toLowerCase() 
                    : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
            ).join("");
        case "PascalCase":
            return words.map(w => 
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
            ).join("");
        default:
            return label;
    }
}

/**
 * Parses words from a technical label, handling various casing formats:
 * - snake_case
 * - kebab-case
 * - camelCase
 * - PascalCase
 * 
 * @param label The technical label to parse
 * @returns Array of words
 */
function parseWordsFromLabel(label: string): string[] {
    // Handle snake_case and kebab-case
    if (label.includes("_") || label.includes("-")) {
        return label.split(/[_-]+/).filter(w => w.length > 0);
    }

    // Handle camelCase and PascalCase
    // Split on uppercase letters, keeping them with the following word
    const words: string[] = [];
    let currentWord = "";
    
    for (let i = 0; i < label.length; i++) {
        const char = label[i];
        const isUpperCase = /[A-Z]/.test(char);
        
        if (isUpperCase && currentWord.length > 0) {
            // Check if this is an acronym (multiple consecutive uppercase)
            const nextChar = label[i + 1];
            const isNextUpperCase = nextChar && /[A-Z]/.test(nextChar);
            
            if (isNextUpperCase) {
                // Part of an acronym, keep adding to current word
                currentWord += char;
            } else {
                // Start of new word
                words.push(currentWord);
                currentWord = char;
            }
        } else {
            currentWord += char;
        }
    }
    
    if (currentWord.length > 0) {
        words.push(currentWord);
    }
    
    return words.filter(w => w.length > 0);
}
