import { describe, it, expect } from 'vitest';
import { classify, diagnose, tipFor, CONTRASTS } from './pronunciation';

describe('classify', () => {
	it('names the umlaut a Persian speaker flattened', () => {
		expect(classify('möchte', 'mochte')).toBe('oe');
		expect(classify('Mütter', 'Mutter')).toBe('ue');
		expect(classify('Bären', 'Baren')).toBe('ae');
	});

	it('catches the umlaut added where there was none', () => {
		// Over-correction: told once about ö, now they put it everywhere.
		expect(classify('schon', 'schön')).toBe('oe');
	});

	it('accepts the ue/oe/ae spellings some recognizers emit', () => {
		expect(classify('über', 'ueber')).toBeNull();
		expect(classify('über', 'uber')).toBe('ue');
	});

	it('reports the first unreproduced umlaut when a word has two', () => {
		expect(classify('Türschlösser', 'Turschlosser')).toBe('ue');
	});

	it('ignores invisible characters in authored content', () => {
		// A soft hyphen pasted into a lesson is invisible in the editor and
		// used to make every comparison fail. I put one here by accident
		// writing these tests, which is the argument for handling it.
		expect(classify('Tür­schlösser', 'Turschlosser')).toBe('ue');
	});

	it('hears sch where the ich-Laut belongs', () => {
		expect(classify('ich', 'isch')).toBe('ich-laut');
		expect(classify('nicht', 'nischt')).toBe('ich-laut');
	});

	it('spots a vowel-length swap', () => {
		expect(classify('Staat', 'Stadt')).toBe('vowel-length');
		expect(classify('Beet', 'Bett')).toBe('vowel-length');
	});

	it('spots the vowel Persian phonotactics insert into a cluster', () => {
		expect(classify('sprechen', 'esprechen')).toBe('initial-cluster');
		expect(classify('Stadt', 'eStadt')).toBe('initial-cluster');
		expect(classify('sprechen', 'seprechen')).toBe('initial-cluster');
	});

	it('says nothing when the word was right', () => {
		expect(classify('möchte', 'möchte')).toBeNull();
		expect(classify('Kaffee', 'Kaffee')).toBeNull();
		expect(classify('Guten', 'guten,')).toBeNull();
	});

	it('stays silent rather than inventing a diagnosis', () => {
		// A wholly different word is a vocabulary miss, not a sound problem.
		// Naming a contrast here would send the learner after a sound that
		// was never wrong.
		expect(classify('Kaffee', 'Tee')).toBeNull();
		expect(classify('Hund', 'Katze')).toBeNull();
	});
});

describe('diagnose', () => {
	it('finds the bad sound inside a whole sentence', () => {
		const notes = diagnose('Ich möchte einen Kaffee', 'Ich mochte einen Kaffee');
		expect(notes).toHaveLength(1);
		expect(notes[0].contrast.id).toBe('oe');
		expect(notes[0].target).toBe('möchte');
		expect(notes[0].heard).toBe('mochte');
	});

	it('survives a dropped word without mis-aligning everything after it', () => {
		// Positional pairing would compare möchte↔einen and einen↔Kaffee and
		// report nonsense for both.
		const notes = diagnose('Ich möchte einen Kaffee', 'Ich mochte Kaffee');
		expect(notes.map((n) => n.contrast.id)).toEqual(['oe']);
	});

	it('survives an inserted word', () => {
		const notes = diagnose('Ich möchte Kaffee', 'Also ich mochte Kaffee');
		expect(notes.map((n) => n.contrast.id)).toEqual(['oe']);
	});

	it('reports each contrast once, not once per word', () => {
		const notes = diagnose('Mütter über Türen', 'Mutter uber Turen');
		expect(notes).toHaveLength(1);
		expect(notes[0].contrast.id).toBe('ue');
	});

	it('reports two different contrasts separately', () => {
		const notes = diagnose('Ich möchte', 'Isch mochte');
		expect(notes.map((n) => n.contrast.id).sort()).toEqual(['ich-laut', 'oe']);
	});

	it('returns nothing for a clean reading', () => {
		expect(diagnose('Ich möchte einen Kaffee', 'Ich möchte einen Kaffee')).toEqual([]);
	});

	it('returns nothing when the learner said something else entirely', () => {
		expect(diagnose('Ich möchte einen Kaffee', 'Guten Morgen')).toEqual([]);
	});

	it('handles empty input without throwing', () => {
		expect(diagnose('', 'Ich')).toEqual([]);
		expect(diagnose('Ich', '')).toEqual([]);
	});
});

describe('tipFor', () => {
	it('gives the instruction in the learner’s language', () => {
		const note = { contrast: CONTRASTS.ue, target: 'Mütter', heard: 'Mutter' };
		expect(tipFor(note.contrast, 'en')).toContain('round your lips');
		expect(tipFor(note.contrast, 'fa')).toContain('گرد کن');
	});

	it('has both languages filled in for every contrast', () => {
		for (const c of Object.values(CONTRASTS)) {
			expect(c.tip.length).toBeGreaterThan(10);
			expect(c.tipFa.length).toBeGreaterThan(10);
			expect(c.pair.right).toBeTruthy();
			expect(c.pair.glossFa).toBeTruthy();
		}
	});
});
