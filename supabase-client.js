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
                        data: { display_name: displayName || 'Learner' }
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
                const { data } = await supabase
                    .from('user_profiles')
                    .select('display_name')
                    .eq('id', user.id)
                    .single();

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
        }
    };
})();
