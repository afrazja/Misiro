import { writable } from 'svelte/store';

export interface ExamQuestion {
	type: 'listen' | 'speak' | 'meaning' | 'gap';
	day: number;
	sentenceId: number;
	audioText: string;
	targetText: string;
	translation: string;
	translationFa?: string;
	/** 'meaning': the German sentence; 'gap': the sentence with ___ for the missing word. */
	promptText?: string;
	/** 'meaning' / 'gap': shuffled tap options and the index of the right one. */
	options?: string[];
	correctIndex?: number;
}

export interface WrongAnswer {
	question: ExamQuestion;
	heard: string;
}

export interface ExamState {
	isExamMode: boolean;
	isReviewMode: boolean;
	examWeek: number;
	examQuestions: ExamQuestion[];
	currentExamIndex: number;
	examScore: number;
	examRetry: boolean;
	examWrongAnswers: WrongAnswer[];
}

const initialState: ExamState = {
	isExamMode: false,
	isReviewMode: false,
	examWeek: 0,
	examQuestions: [],
	currentExamIndex: 0,
	examScore: 0,
	examRetry: false,
	examWrongAnswers: []
};

export const examStore = writable<ExamState>(initialState);
