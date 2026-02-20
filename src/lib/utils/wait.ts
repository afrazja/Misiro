/**
 * Utility: promise-based delay.
 * Extracted from app.js wait().
 */

/**
 * Wait for the specified number of milliseconds.
 * Used between audio sequences to add natural pauses.
 */
export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
