import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthState {
	user: User | null;
	session: Session | null;
	isAuthenticated: boolean;
	displayName: string;
	avatarUrl: string | null;
	isLoading: boolean;
}

const initialState: AuthState = {
	user: null,
	session: null,
	isAuthenticated: false,
	displayName: 'Learner',
	avatarUrl: null,
	isLoading: true
};

export const authStore = writable<AuthState>(initialState);
