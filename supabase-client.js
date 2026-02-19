// Misiro Auth Layer — wraps Supabase Auth
// Exposes window.misiroAuth for use across all pages

(function () {
    const config = window.MISIRO_CONFIG || {};
    let supabase = null;

    // Initialize Supabase client if credentials are configured
    if (config.supabaseUrl && config.supabaseAnonKey
        && !config.supabaseUrl.includes('YOUR_PROJECT')) {
        try {
            supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        } catch (e) {
            console.error('Supabase init failed:', e);
        }
    }

    window.misiroAuth = {
        _supabase: supabase,

        /** @returns {boolean} Whether Supabase is configured and available */
        isConfigured() {
            return !!supabase;
        },

        /** @returns {Promise<Object|null>} Current user or null */
        async getUser() {
            if (!supabase) return null;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                return user;
            } catch (e) {
                return null;
            }
        },

        /** @returns {Promise<Object|null>} Current session or null */
        async getSession() {
            if (!supabase) return null;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                return session;
            } catch (e) {
                return null;
            }
        },

        /** @returns {Promise<boolean>} Whether user is logged in */
        async isAuthenticated() {
            const session = await this.getSession();
            return !!session;
        },

        /**
         * Sign up with email, password, and display name
         * @returns {Promise<{user: Object|null, error: string|null}>}
         */
        async signUp(email, password, displayName) {
            if (!supabase) return { user: null, error: 'Supabase not configured' };
            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { display_name: displayName || 'Learner' },
                        emailRedirectTo: window.location.origin + '/home.html?confirmed=true'
                    }
                });
                if (error) return { user: null, error: error.message };
                return { user: data.user, error: null };
            } catch (e) {
                return { user: null, error: e.message };
            }
        },

        /**
         * Sign in with email and password
         * @returns {Promise<{user: Object|null, error: string|null}>}
         */
        async signIn(email, password) {
            if (!supabase) return { user: null, error: 'Supabase not configured' };
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) return { user: null, error: error.message };
                return { user: data.user, error: null };
            } catch (e) {
                return { user: null, error: e.message };
            }
        },

        /**
         * Sign out current user
         * @returns {Promise<{error: string|null}>}
         */
        async signOut() {
            if (!supabase) return { error: null };
            try {
                const { error } = await supabase.auth.signOut();
                // Clear all Misiro localStorage data on sign-out
                if (window.MisiroData?.clearAllLocal) {
                    MisiroData.clearAllLocal();
                }
                return { error: error ? error.message : null };
            } catch (e) {
                return { error: e.message };
            }
        },

        /**
         * Listen for auth state changes
         * @param {Function} callback - receives (event, session)
         * @returns {Object} subscription with unsubscribe()
         */
        onAuthStateChange(callback) {
            if (!supabase) return { unsubscribe: () => {} };
            const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
            return subscription;
        },

        /**
         * Get the user's display name from their profile
         * Falls back to auth metadata if profile row doesn't exist yet
         * @returns {Promise<string>}
         */
        async getDisplayName() {
            if (!supabase) return 'Learner';
            try {
                const user = await this.getUser();
                if (!user) return 'Learner';

                // Try reading from user_profiles table first
                // Use maybeSingle() to avoid 406 error when no row exists
                const { data } = await supabase
                    .from('user_profiles')
                    .select('display_name')
                    .eq('id', user.id)
                    .maybeSingle();

                if (data?.display_name) return data.display_name;

                // Fallback: read from auth user metadata (set during signup)
                const metaName = user.user_metadata?.display_name;
                if (metaName) {
                    // Profile row missing — create it now
                    await this.ensureProfile(user);
                    return metaName;
                }

                // Last fallback: use email prefix
                return user.email?.split('@')[0] || 'Learner';
            } catch (e) {
                // If table query failed, try auth metadata directly
                try {
                    const user = await this.getUser();
                    return user?.user_metadata?.display_name
                        || user?.email?.split('@')[0]
                        || 'Learner';
                } catch (e2) {
                    return 'Learner';
                }
            }
        },

        /**
         * Ensure the user has a profile and progress row
         * Called as a safety net if the DB trigger didn't fire
         */
        async ensureProfile(user) {
            if (!supabase || !user) return;
            try {
                const displayName = user.user_metadata?.display_name || 'Learner';
                await supabase.from('user_profiles').upsert({
                    id: user.id,
                    display_name: displayName
                }, { onConflict: 'id' });
                await supabase.from('user_progress').upsert({
                    user_id: user.id
                }, { onConflict: 'user_id' });
            } catch (e) {
                console.error('ensureProfile error:', e);
            }
        },

        /**
         * Update the user's password
         * @param {string} newPassword - must be at least 6 characters
         * @returns {Promise<{error: string|null}>}
         */
        async updatePassword(newPassword) {
            if (!supabase) return { error: 'Supabase not configured' };
            try {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) return { error: error.message };
                return { error: null };
            } catch (e) {
                return { error: e.message };
            }
        },

        /**
         * Update the user's display name in both auth metadata and user_profiles table
         * @param {string} newName
         * @returns {Promise<{error: string|null}>}
         */
        async updateDisplayName(newName) {
            if (!supabase) return { error: 'Supabase not configured' };
            try {
                const user = await this.getUser();
                if (!user) return { error: 'Not authenticated' };

                // Update auth user metadata
                const { error: authError } = await supabase.auth.updateUser({
                    data: { display_name: newName }
                });
                if (authError) return { error: authError.message };

                // Update user_profiles table
                const { error: dbError } = await supabase
                    .from('user_profiles')
                    .update({ display_name: newName, updated_at: new Date().toISOString() })
                    .eq('id', user.id);
                if (dbError) return { error: dbError.message };

                return { error: null };
            } catch (e) {
                return { error: e.message };
            }
        },

        /**
         * Upload an avatar image to Supabase Storage and update user_profiles
         * @param {File} file - image file (max 1MB)
         * @returns {Promise<{url: string|null, error: string|null}>}
         */
        async uploadAvatar(file) {
            if (!supabase) return { url: null, error: 'Supabase not configured' };
            try {
                const user = await this.getUser();
                if (!user) return { url: null, error: 'Not authenticated' };

                // Validate file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                    return { url: null, error: 'Image must be less than 5MB' };
                }

                // Validate file type (only safe image formats)
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    return { url: null, error: 'Only JPG, PNG, GIF, or WebP images are allowed' };
                }

                // Map MIME type to safe extension (ignore user-provided filename)
                const mimeToExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
                const ext = mimeToExt[file.type] || 'png';
                const filePath = `${user.id}/avatar.${ext}`;

                // Upload to Supabase Storage (upsert to overwrite existing)
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file, { upsert: true });

                if (uploadError) {
                    console.warn('Storage upload failed:', uploadError.message);
                    // Fallback: use a local blob URL so avatar shows immediately
                    const blobUrl = URL.createObjectURL(file);
                    return { url: blobUrl, error: null, warning: 'Saved locally only. Storage bucket "avatars" may not exist. ' + uploadError.message };
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                const publicUrl = urlData.publicUrl + '?t=' + Date.now(); // cache-bust

                // Update user_profiles (non-blocking — don't fail if avatar_url column missing)
                try {
                    await supabase
                        .from('user_profiles')
                        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
                        .eq('id', user.id);
                } catch (dbErr) {
                    console.warn('Could not save avatar_url to DB:', dbErr.message);
                }

                return { url: publicUrl, error: null };
            } catch (e) {
                return { url: null, error: e.message };
            }
        },

        /**
         * Remove the user's avatar from Storage and clear avatar_url
         * @returns {Promise<{error: string|null}>}
         */
        async removeAvatar() {
            if (!supabase) return { error: 'Supabase not configured' };
            try {
                const user = await this.getUser();
                if (!user) return { error: 'Not authenticated' };

                // List files in user's avatar folder and remove them
                const { data: files } = await supabase.storage
                    .from('avatars')
                    .list(user.id);
                if (files && files.length > 0) {
                    const paths = files.map(f => `${user.id}/${f.name}`);
                    await supabase.storage.from('avatars').remove(paths);
                }

                // Clear avatar_url in user_profiles
                const { error: dbError } = await supabase
                    .from('user_profiles')
                    .update({ avatar_url: null, updated_at: new Date().toISOString() })
                    .eq('id', user.id);
                if (dbError) return { error: dbError.message };

                return { error: null };
            } catch (e) {
                return { error: e.message };
            }
        },

        /**
         * Get the user's avatar URL from user_profiles
         * @returns {Promise<string|null>}
         */
        async getAvatarUrl() {
            if (!supabase) return null;
            try {
                const user = await this.getUser();
                if (!user) return null;

                const { data } = await supabase
                    .from('user_profiles')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .maybeSingle();

                return data?.avatar_url || null;
            } catch (e) {
                return null;
            }
        }
    };
})();
