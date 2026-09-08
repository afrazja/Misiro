import { getSupabaseServerClient } from '$lib/supabase/server';
import { redirect, type Handle } from '@sveltejs/kit';
import { isAvailableCourse, needsCourse } from '$lib/courses';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = getSupabaseServerClient(event.cookies);

	// Make Supabase client available to all server-side code
	event.locals.supabase = supabase;

	// Refresh the session (required for cookie-based auth)
	const {
		data: { session }
	} = await supabase.auth.getSession();

	event.locals.session = session;
	event.locals.user = session?.user ?? null;
	if (event.locals.user && needsCourse(event.url.pathname) &&
		!isAvailableCourse(event.locals.user.user_metadata?.target_language)) {
		redirect(303, '/languages');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
