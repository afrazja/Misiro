/**
 * Device detection utilities.
 * Extracted from app.js _isMobile detection.
 */

/**
 * Detect if the current device is a mobile phone/tablet.
 * Uses user agent detection (same approach as original app.js).
 */
export function isMobile(): boolean {
	if (typeof navigator === 'undefined') return false;
	return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Detect if the viewport is at mobile width (600px or less).
 * Useful for responsive layout decisions.
 */
export function isMobileWidth(): boolean {
	if (typeof window === 'undefined') return false;
	return window.innerWidth <= 600;
}
