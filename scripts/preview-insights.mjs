/** Local-only, fictional-data preview. No production Supabase credentials are read. */
import http from 'node:http';
import { spawn } from 'node:child_process';
const origin = 'http://127.0.0.1:54329';
const now = Date.now();
const day = 86_400_000;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const iso = (days, seconds = 0) => new Date(now - days * day + seconds * 1000).toISOString();
const users = Array.from({ length: 9 }, (_, i) => ({ id: id(i + 1), created_at: iso(i === 8 ? 25 : 12 - i), email: `fictional-${i + 1}@example.invalid`, user_metadata: {} }));
let events = [], seq = 0;
function add(user, visit, attempt, name, ago, metadata = {}) {
	const n = ++seq;
	events.push({ id: n, event_id: id(n + 100), user_id: id(user), session_id: id(visit), attempt_id: attempt ? id(attempt) : null, day: attempt ? 1 : null, event_name: name, schema_version: 2, occurred_at: iso(ago, n), created_at: iso(ago, n), metadata: { page: attempt ? 'lesson' : 'home', device: user % 2 ? 'mobile' : 'desktop', browser: 'Chrome', language: user % 2 ? 'fa' : 'en', mode: 'lesson', sequence: n, ...metadata } });
}
add(9, 99, null, 'visit_started', 20);
for (let user = 1; user <= 6; user++) {
	const ago = 11 - user, visit = user + 10, attempt = user + 30;
	add(user, visit, null, 'visit_started', ago); add(user, visit, null, 'page_viewed', ago);
	if (user === 6) continue;
	add(user, visit, attempt, 'lesson_started', ago);
	if (user === 5) continue;
	add(user, visit, attempt, 'lesson_begun', ago); add(user, visit, attempt, 'lesson_progress', ago, { index: 0, total: 9 });
	add(user, visit, attempt, 'mic_requested', ago);
	if (user <= 3) add(user, visit, attempt, 'obstacle', ago, { code: 'mic_denied', index: 0 });
	if (user === 4) continue;
	add(user, visit, attempt, 'mic_requested', ago); add(user, visit, attempt, 'mic_ready', ago);
	add(user, visit, attempt, 'answer_submitted', ago, { index: 0, correct: false });
	add(user, visit, attempt, 'answer_submitted', ago, { index: 0, correct: true });
	if (user === 1) add(user, visit, attempt, 'lesson_attempt_completed', ago);
	add(user, visit, attempt, 'page_hidden', ago);
	add(user, visit + 50, attempt, 'visit_started', ago - 2);
	add(user, visit + 50, attempt, 'lesson_started', ago - 2);
	add(user, visit + 50, attempt, 'lesson_resumed', ago - 2, { index: 1 });
	add(user, visit + 50, attempt, 'answer_submitted', ago - 2, { index: 1, correct: true });
	add(user, visit + 50, attempt, 'lesson_attempt_completed', ago - 2);
}
const exclusions = new Set([id(8)]);
const server = http.createServer(async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
	res.setHeader('Access-Control-Allow-Headers', '*');
	if (req.method === 'OPTIONS') { res.end(); return; }
	const url = new URL(req.url, origin);
	const respond = (data, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
	if (url.pathname === '/auth/v1/admin/users') { respond({ users, aud: 'authenticated', next_page: null, last_page: 1, total: users.length }); return; }
	if (url.pathname === '/auth/v1/user') { respond({ message: 'No session' }, 401); return; }
	const table = url.pathname.split('/').at(-1);
	if (table === 'analytics_exclusions' && req.method !== 'GET' && req.method !== 'HEAD') {
		if (req.method === 'DELETE') exclusions.delete(url.searchParams.get('user_id')?.replace('eq.', ''));
		else { let raw = ''; for await (const chunk of req) raw += chunk; const body = JSON.parse(raw); exclusions.add(body.user_id); }
		res.statusCode = 204; res.end(); return;
	}
	let rows = table === 'analytics_settings' ? [{ id: true, installed_at: iso(21), schema_version: 2 }]
		: table === 'user_profiles' ? users.map(u => ({ id: u.id, is_admin: u.id === id(9) }))
		: table === 'analytics_exclusions' ? [...exclusions].map(user_id => ({ user_id }))
		: table === 'events' ? events : [];
	if (req.method === 'HEAD') { res.setHeader('Content-Range', `0-0/${table === 'events' ? 95 : rows.length}`); res.end(); return; }
	const offset = Number(url.searchParams.get('offset') ?? 0), limit = Number(url.searchParams.get('limit') ?? rows.length);
	// An intentionally small cap exercises pagination in the real report loader.
	rows = rows.slice(offset, offset + Math.min(limit, 17));
	respond(req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] : rows);
});
server.listen(54329, '127.0.0.1', () => {
	console.log('FICTIONAL DATA PREVIEW: http://localhost:5173/admin');
	console.log('Local login: preview@mirifer.local / local-preview-only');
	const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
		stdio: 'inherit', windowsHide: true,
		env: { ...process.env, PUBLIC_SUPABASE_URL: origin, PUBLIC_SUPABASE_ANON_KEY: 'local-preview-anon', SUPABASE_SERVICE_ROLE_KEY: 'local-preview-service', ADMIN_EMAIL: 'preview@mirifer.local', ADMIN_PASSWORD: 'local-preview-only', INSIGHTS_PREVIEW: '1' }
	});
	child.on('exit', () => server.close());
	process.on('SIGINT', () => { child.kill(); server.close(); });
	process.on('SIGTERM', () => { child.kill(); server.close(); });
});
