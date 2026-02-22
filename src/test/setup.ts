import { vi } from 'vitest';

// Web Speech API is browser-only; stub it so any module that imports it doesn't throw
Object.assign(global, {
	SpeechRecognition: vi.fn(),
	webkitSpeechRecognition: vi.fn()
});

// Clear localStorage before every test to prevent state leaking between tests
beforeEach(() => {
	localStorage.clear();
});
