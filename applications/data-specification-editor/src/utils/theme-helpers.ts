/**
 * Theme helper utilities for consistent theming across the application
 */

/**
 * Returns the appropriate AppBar gradient based on the current theme mode
 * @param mode - The current theme mode ('light' or 'dark')
 * @returns CSS gradient string for the AppBar background
 */
export function getAppBarGradient(mode: "light" | "dark"): string {
  const DARK_GRADIENT = "linear-gradient(5deg, #2c1a45, #2a3f8f)";
  const LIGHT_GRADIENT = "linear-gradient(5deg, #5d2f86, #3f51b5)";
  
  return mode === "dark" ? DARK_GRADIENT : LIGHT_GRADIENT;
}
