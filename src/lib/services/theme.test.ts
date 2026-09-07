import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { refreshTheme, resolvedTheme, setTheme, THEME_KEY, themeChoice } from './theme';

afterEach(() => {
	window.history.replaceState({}, '', '/');
	vi.unstubAllGlobals();
});

describe('landing page theme', () => {
	it.each(['/', '/fa', '/fa/'])('keeps %s light without replacing the saved dark preference', (path) => {
		window.history.replaceState({}, '', path);
		setTheme('dark');
		expect(document.documentElement.dataset.theme).toBe('light');
		expect(get(resolvedTheme)).toBe('light');
		expect(get(themeChoice)).toBe('dark');
		expect(localStorage.getItem(THEME_KEY)).toBe('dark');
	});

	it('restores the app theme when navigating away and light on return', () => {
		window.history.replaceState({}, '', '/home');
		setTheme('dark');
		expect(get(resolvedTheme)).toBe('dark');
		window.history.replaceState({}, '', '/');
		refreshTheme();
		expect(get(resolvedTheme)).toBe('light');
		window.history.replaceState({}, '', '/basics');
		refreshTheme();
		expect(get(resolvedTheme)).toBe('dark');
	});

	it('ignores the dark system preference only on landing pages', () => {
		vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
		window.history.replaceState({}, '', '/fa');
		setTheme('system');
		expect(get(resolvedTheme)).toBe('light');
		window.history.replaceState({}, '', '/home');
		refreshTheme();
		expect(get(resolvedTheme)).toBe('dark');
	});
});
