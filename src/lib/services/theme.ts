/**
 * Light / dark theme.
 *
 * `light` is the default look — white cards on a soft ground, deep-green
 * brand, taken from the app screenshot on the landing page. `dark` is the
 * console palette that matches the admin panel. `system` follows the OS.
 *
 * The choice is written to <html data-theme> and mirrored to localStorage.
 * A tiny inline script in app.html applies the stored value before first
 * paint, so there is no flash of the wrong theme; this module must use the
 * SAME key and attribute.
 */

import { writable } from 'svelte/store';

export type ThemeChoice = 'light' | 'dark' | 'system';

/** Must match the inline boot script in app.html. */
export const THEME_KEY = 'mirifer_theme';

/** What the user picked (may be 'system'). */
export const themeChoice = writable<ThemeChoice>('light');
/** What is actually painted right now — 'system' already resolved. */
export const resolvedTheme = writable<'light' | 'dark'>('light');

function prefersDark(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
	);
}

function resolve(choice: ThemeChoice): 'light' | 'dark' {
	return choice === 'system' ? (prefersDark() ? 'dark' : 'light') : choice;
}

/** Paint a theme without persisting it (used by the system-change listener). */
function paint(choice: ThemeChoice): void {
	if (typeof document === 'undefined') return;
	const actual = resolve(choice);
	document.documentElement.setAttribute('data-theme', actual);
	resolvedTheme.set(actual);
	// Keep the mobile browser chrome in step with the page.
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute('content', actual === 'dark' ? '#0f0f1a' : '#0e5c45');
}

/** Read the stored choice; defaults to light for a first-time visitor. */
export function getStoredTheme(): ThemeChoice {
	if (typeof localStorage === 'undefined') return 'light';
	const v = localStorage.getItem(THEME_KEY);
	return v === 'dark' || v === 'light' || v === 'system' ? v : 'light';
}

export function setTheme(choice: ThemeChoice): void {
	themeChoice.set(choice);
	paint(choice);
	try {
		localStorage.setItem(THEME_KEY, choice);
	} catch {
		// Private mode / storage full — the theme still applies this session.
	}
}

/** Cycle the toggle: light → dark → light. */
export function toggleTheme(): void {
	let current: ThemeChoice = 'light';
	themeChoice.subscribe((v) => (current = v))();
	setTheme(resolve(current) === 'dark' ? 'light' : 'dark');
}

/** Call once on app start (after hydration) to sync the stores. */
export function initTheme(): void {
	const choice = getStoredTheme();
	themeChoice.set(choice);
	paint(choice);

	// Only follow the OS while the user has explicitly chosen 'system'.
	if (typeof window !== 'undefined' && window.matchMedia) {
		window
			.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener?.('change', () => {
				if (getStoredTheme() === 'system') paint('system');
			});
	}
}
