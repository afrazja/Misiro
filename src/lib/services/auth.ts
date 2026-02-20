/**
 * Auth Service — wraps Supabase Auth for use across the app.
 * Ported from supabase-client.js (window.misiroAuth IIFE).
 */

import { getSupabaseBrowserClient } from '$lib/supabase/client';
import type { SupabaseClient, User } from '@supabase/supabase-js';

function sb(): SupabaseClient | null {
	try {
		return getSupabaseBrowserClient();
	} catch {
		return null;
	}
}

/** Whether Supabase is configured and available */
export function isConfigured(): boolean {
	return !!sb();
}

/** Get current user or null */
export async function getUser(): Promise<User | null> {
	const client = sb();
	if (!client) return null;
	try {
		const { data: { user } } = await client.auth.getUser();
		return user;
	} catch {
		return null;
	}
}

/** Get current session or null */
export async function getSession() {
	const client = sb();
	if (!client) return null;
	try {
		const { data: { session } } = await client.auth.getSession();
		return session;
	} catch {
		return null;
	}
}

/** Whether user is logged in */
export async function isAuthenticated(): Promise<boolean> {
	const session = await getSession();
	return !!session;
}

/** Sign up with email, password, and display name */
export async function signUp(
	email: string,
	password: string,
	displayName?: string
): Promise<{ user: User | null; error: string | null }> {
	const client = sb();
	if (!client) return { user: null, error: 'Supabase not configured' };
	try {
		const { data, error } = await client.auth.signUp({
			email,
			password,
			options: {
				data: { display_name: displayName || 'Learner' },
				emailRedirectTo: window.location.origin + '/?confirmed=true'
			}
		});
		if (error) return { user: null, error: error.message };
		return { user: data.user, error: null };
	} catch (e: any) {
		return { user: null, error: e.message };
	}
}

/** Sign in with email and password */
export async function signIn(
	email: string,
	password: string
): Promise<{ user: User | null; error: string | null }> {
	const client = sb();
	if (!client) return { user: null, error: 'Supabase not configured' };
	try {
		const { data, error } = await client.auth.signInWithPassword({ email, password });
		if (error) return { user: null, error: error.message };
		return { user: data.user, error: null };
	} catch (e: any) {
		return { user: null, error: e.message };
	}
}

/** Sign out current user */
export async function signOut(): Promise<{ error: string | null }> {
	const client = sb();
	if (!client) return { error: null };
	try {
		// Import data-layer dynamically to avoid circular deps
		const { clearAllLocal } = await import('./data-layer');
		clearAllLocal();

		const { error } = await client.auth.signOut();
		return { error: error ? error.message : null };
	} catch (e: any) {
		return { error: e.message };
	}
}

/** Listen for auth state changes */
export function onAuthStateChange(
	callback: (event: string, session: any) => void
): { unsubscribe: () => void } {
	const client = sb();
	if (!client) return { unsubscribe: () => {} };
	const { data: { subscription } } = client.auth.onAuthStateChange(callback);
	return subscription;
}

/** Get the user's display name */
export async function getDisplayName(): Promise<string> {
	const client = sb();
	if (!client) return 'Learner';
	try {
		const user = await getUser();
		if (!user) return 'Learner';

		// Try user_profiles table first
		const { data } = await client
			.from('user_profiles')
			.select('display_name')
			.eq('id', user.id)
			.maybeSingle();

		if (data?.display_name) return data.display_name;

		// Fallback: auth user metadata
		const metaName = user.user_metadata?.display_name;
		if (metaName) {
			await ensureProfile(user);
			return metaName;
		}

		return user.email?.split('@')[0] || 'Learner';
	} catch {
		try {
			const user = await getUser();
			return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Learner';
		} catch {
			return 'Learner';
		}
	}
}

/** Ensure user has profile and progress rows */
export async function ensureProfile(user: User): Promise<void> {
	const client = sb();
	if (!client || !user) return;
	try {
		const displayName = user.user_metadata?.display_name || 'Learner';
		await client.from('user_profiles').upsert(
			{ id: user.id, display_name: displayName },
			{ onConflict: 'id' }
		);
		await client.from('user_progress').upsert(
			{ user_id: user.id },
			{ onConflict: 'user_id' }
		);
	} catch (e) {
		console.error('ensureProfile error:', e);
	}
}

/** Update password */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
	const client = sb();
	if (!client) return { error: 'Supabase not configured' };
	try {
		const { error } = await client.auth.updateUser({ password: newPassword });
		if (error) return { error: error.message };
		return { error: null };
	} catch (e: any) {
		return { error: e.message };
	}
}

/** Update display name in auth metadata + user_profiles */
export async function updateDisplayName(newName: string): Promise<{ error: string | null }> {
	const client = sb();
	if (!client) return { error: 'Supabase not configured' };
	try {
		const user = await getUser();
		if (!user) return { error: 'Not authenticated' };

		const { error: authError } = await client.auth.updateUser({
			data: { display_name: newName }
		});
		if (authError) return { error: authError.message };

		const { error: dbError } = await client
			.from('user_profiles')
			.update({ display_name: newName, updated_at: new Date().toISOString() })
			.eq('id', user.id);
		if (dbError) return { error: dbError.message };

		return { error: null };
	} catch (e: any) {
		return { error: e.message };
	}
}

/** Upload an avatar image (max 5MB, image only) */
export async function uploadAvatar(
	file: File
): Promise<{ url: string | null; error: string | null; warning?: string }> {
	const client = sb();
	if (!client) return { url: null, error: 'Supabase not configured' };
	try {
		const user = await getUser();
		if (!user) return { url: null, error: 'Not authenticated' };

		if (file.size > 5 * 1024 * 1024) {
			return { url: null, error: 'Image must be less than 5MB' };
		}

		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			return { url: null, error: 'Only JPG, PNG, GIF, or WebP images are allowed' };
		}

		const mimeToExt: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/webp': 'webp'
		};
		const ext = mimeToExt[file.type] || 'png';
		const filePath = `${user.id}/avatar.${ext}`;

		const { error: uploadError } = await client.storage
			.from('avatars')
			.upload(filePath, file, { upsert: true });

		if (uploadError) {
			console.warn('Storage upload failed:', uploadError.message);
			const blobUrl = URL.createObjectURL(file);
			return {
				url: blobUrl,
				error: null,
				warning: 'Saved locally only. ' + uploadError.message
			};
		}

		const { data: urlData } = client.storage.from('avatars').getPublicUrl(filePath);
		const publicUrl = urlData.publicUrl + '?t=' + Date.now();

		try {
			await client
				.from('user_profiles')
				.update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
				.eq('id', user.id);
		} catch (dbErr: any) {
			console.warn('Could not save avatar_url to DB:', dbErr.message);
		}

		return { url: publicUrl, error: null };
	} catch (e: any) {
		return { url: null, error: e.message };
	}
}

/** Remove avatar from storage and clear avatar_url */
export async function removeAvatar(): Promise<{ error: string | null }> {
	const client = sb();
	if (!client) return { error: 'Supabase not configured' };
	try {
		const user = await getUser();
		if (!user) return { error: 'Not authenticated' };

		const { data: files } = await client.storage.from('avatars').list(user.id);
		if (files && files.length > 0) {
			const paths = files.map((f) => `${user.id}/${f.name}`);
			await client.storage.from('avatars').remove(paths);
		}

		const { error: dbError } = await client
			.from('user_profiles')
			.update({ avatar_url: null, updated_at: new Date().toISOString() })
			.eq('id', user.id);
		if (dbError) return { error: dbError.message };

		return { error: null };
	} catch (e: any) {
		return { error: e.message };
	}
}

/** Get avatar URL from user_profiles */
export async function getAvatarUrl(): Promise<string | null> {
	const client = sb();
	if (!client) return null;
	try {
		const user = await getUser();
		if (!user) return null;

		const { data } = await client
			.from('user_profiles')
			.select('avatar_url')
			.eq('id', user.id)
			.maybeSingle();

		return data?.avatar_url || null;
	} catch {
		return null;
	}
}
