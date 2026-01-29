/**
 * Simple color generator implementation for consistent color generation across models.
 * This generates unique colors based on model identifiers using a deterministic algorithm.
 */

function generateColor(identifier: string, brightness: number): string {
  let sum: number = 0;
  for (let i = 0; i < identifier.length; i++) {
    sum += identifier.charCodeAt(i);
  }

  const offset = brightness;
  const range = 255 - offset;
  // Generate red, green and blue.
  // We shift this by the offset and update by range to get
  // a value between brightness and 255.
  const r = Math.floor(sinusTransformation(sum + 1) * range) + offset;
  const g = Math.floor(sinusTransformation(sum + 2) * range) + offset;
  const b = Math.floor(sinusTransformation(sum + 3) * range) + offset;

  // Generate hex value.
  let color = "#";
  color += ("00" + r.toString(16)).slice(-2).toUpperCase();
  color += ("00" + g.toString(16)).slice(-2).toUpperCase();
  color += ("00" + b.toString(16)).slice(-2).toUpperCase();
  return color;
}

/**
 * Transforms a number into a decimal value between 0 and 1 using sinus function.
 * The Math.sin() result is converted to a string and the last 7 characters are used
 * to create a pseudo-random but deterministic decimal value.
 * 
 * @example
 * sinusTransformation(123) => 0.1234567 (example value)
 */
const sinusTransformation = (value: number): number => {
  return Number("0." + Math.sin(value + 1).toString().slice(-7));
}

/**
 * Generates a unique color for a model based on its identifier.
 * Uses the same algorithm as the ColorGenerator from @dataspecer/visual-model
 * to ensure consistency across the application.
 * 
 * @param modelId The unique identifier of the model
 * @returns A hex color string (e.g., "#4998F9")
 */
export function generateModelColor(modelId: string): string {
  return generateColor(modelId, 64);
}
