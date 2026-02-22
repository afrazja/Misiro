import { describe, it, expect } from 'vitest';
import { parseConfig } from './config';

const VALID_URL = 'https://abcdefgh.supabase.co';
const VALID_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
const VALID_ENV = { PUBLIC_SUPABASE_URL: VALID_URL, PUBLIC_SUPABASE_ANON_KEY: VALID_KEY };

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('parseConfig — valid input', () => {
	it('returns supabaseUrl and supabaseAnonKey from valid env vars', () => {
		const cfg = parseConfig(VALID_ENV);
		expect(cfg.supabaseUrl).toBe(VALID_URL);
		expect(cfg.supabaseAnonKey).toBe(VALID_KEY);
	});

	it('accepts any HTTPS Supabase-style URL', () => {
		expect(() =>
			parseConfig({ ...VALID_ENV, PUBLIC_SUPABASE_URL: 'https://myproject.supabase.co' })
		).not.toThrow();
	});

	it('accepts any non-empty anon key string', () => {
		expect(() =>
			parseConfig({ ...VALID_ENV, PUBLIC_SUPABASE_ANON_KEY: 'any-non-empty-string' })
		).not.toThrow();
	});
});

// ─── Missing variables ────────────────────────────────────────────────────────

describe('parseConfig — missing variables', () => {
	it('throws when PUBLIC_SUPABASE_URL is absent', () => {
		expect(() => parseConfig({ PUBLIC_SUPABASE_ANON_KEY: VALID_KEY })).toThrow('[config]');
	});

	it('throws when PUBLIC_SUPABASE_ANON_KEY is absent', () => {
		expect(() => parseConfig({ PUBLIC_SUPABASE_URL: VALID_URL })).toThrow('[config]');
	});

	it('throws when both variables are absent', () => {
		expect(() => parseConfig({})).toThrow('[config]');
	});

	it('throws when passed an empty object', () => {
		expect(() => parseConfig({})).toThrow();
	});
});

// ─── Invalid values ───────────────────────────────────────────────────────────

describe('parseConfig — invalid values', () => {
	it('throws when PUBLIC_SUPABASE_URL is not a URL', () => {
		const err = (() => {
			try {
				parseConfig({ ...VALID_ENV, PUBLIC_SUPABASE_URL: 'not-a-url' });
			} catch (e: any) {
				return e.message as string;
			}
		})();
		expect(err).toContain('PUBLIC_SUPABASE_URL');
		expect(err).toContain('valid URL');
	});

	it('throws when PUBLIC_SUPABASE_URL is an empty string', () => {
		expect(() => parseConfig({ ...VALID_ENV, PUBLIC_SUPABASE_URL: '' })).toThrow('PUBLIC_SUPABASE_URL');
	});

	it('throws when PUBLIC_SUPABASE_URL is undefined', () => {
		expect(() => parseConfig({ ...VALID_ENV, PUBLIC_SUPABASE_URL: undefined })).toThrow('[config]');
	});

	it('throws when PUBLIC_SUPABASE_ANON_KEY is an empty string', () => {
		const err = (() => {
			try {
				parseConfig({ ...VALID_ENV, PUBLIC_SUPABASE_ANON_KEY: '' });
			} catch (e: any) {
				return e.message as string;
			}
		})();
		expect(err).toContain('PUBLIC_SUPABASE_ANON_KEY');
		expect(err).toContain('must not be empty');
	});

	it('throws when PUBLIC_SUPABASE_ANON_KEY is undefined', () => {
		expect(() => parseConfig({ ...VALID_ENV, PUBLIC_SUPABASE_ANON_KEY: undefined })).toThrow('[config]');
	});
});

// ─── Error message quality ────────────────────────────────────────────────────

describe('parseConfig — error message format', () => {
	it('error message starts with [config]', () => {
		expect(() => parseConfig({})).toThrow(/^\[config\]/);
	});

	it('lists PUBLIC_SUPABASE_URL in the error when it is missing', () => {
		expect(() => parseConfig({ PUBLIC_SUPABASE_ANON_KEY: VALID_KEY })).toThrow(
			'PUBLIC_SUPABASE_URL'
		);
	});

	it('lists PUBLIC_SUPABASE_ANON_KEY in the error when it is missing', () => {
		expect(() => parseConfig({ PUBLIC_SUPABASE_URL: VALID_URL })).toThrow(
			'PUBLIC_SUPABASE_ANON_KEY'
		);
	});

	it('lists both variables when both are missing', () => {
		let message = '';
		try {
			parseConfig({});
		} catch (e: any) {
			message = e.message;
		}
		expect(message).toContain('PUBLIC_SUPABASE_URL');
		expect(message).toContain('PUBLIC_SUPABASE_ANON_KEY');
	});
});
