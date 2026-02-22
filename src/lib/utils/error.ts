/**
 * Centralised error logging.
 *
 * All caught errors pass through here rather than being scattered across
 * raw console calls. Swap the implementation for a real reporting service
 * (e.g. Sentry, LogRocket) without touching any call sites.
 */

export function logError(context: string, error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`[${context}] ${message}`, error);
}

export function logWarn(context: string, message: string): void {
	console.warn(`[${context}] ${message}`);
}
