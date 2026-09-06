/** Local-only, fictional-data preview. No production Supabase credentials are read. */
import http from 'node:http';
import { spawn } from 'node:child_process';
const origin = 'http://127.0.0.1:54329';
const now = Date.now();
const day = 86_400_000;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const iso = (days, seconds = 0) => new Date(now - days * day + seconds * 1000).toISOString();
const users = Array.from({ length: 9 }, (_, i) => ({ id: id(i + 1), created_at: iso(i === 8 ? 25 : 12 - i), email: `fictional-${i + 1}@example.invalid`, user_metadata: {} }));
users[0].created_at = iso(28); users[1].created_at = iso(27); users[2].created_at = iso(12); users[8].created_at = iso(50);
const contentVersion = 'd1-b16223d52c0e7291'; // Verified against lessonVersion in pass-two.test.ts.
const lessons = [{ id: id(501), day: 1, title: 'At the café', title_fa: '', group: 'basics', sort_order: 1 }];
const sentences = [
	{ id: id(601), lesson_id: id(501), sentence_order: 0, role: 'received', audio_text: 'Guten Tag!', target_text: null, translation: 'Hello!', translation_fa: null },
	{ id: id(602), lesson_id: id(501), sentence_order: 1, role: 'sent', audio_text: null, target_text: 'Einen Kaffee, bitte.', translation: 'A coffee, please.', translation_fa: null, hint: 'Use bitte.' }
];
const learner = { ...users[6], aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { display_name: 'Preview Learner', target_language: 'de' } };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: learner.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(now / 1000) + 86400 })}.local-fixture-only`;
let events = [], seq = 0;
function add(user, visit, attempt, name, ago, metadata = {}) {
	const n = ++seq;
	events.push({ id: n, event_id: id(n + 100), user_id: id(user), session_id: id(visit), attempt_id: attempt ? id(attempt) : null, day: attempt ? 1 : null, event_name: name, schema_version: 2, occurred_at: iso(ago, n), created_at: iso(ago, n), metadata: { page: attempt ? 'lesson' : 'home', device: user % 2 ? 'mobile' : 'desktop', browser: 'Chrome', language: user % 2 ? 'fa' : 'en', mode: 'lesson', insights_version: 3, ...(attempt ? { lesson_version: contentVersion } : {}), sequence: n, ...metadata } });
}
add(9, 99, null, 'visit_started', 40);
for (let user = 1; user <= 6; user++) {
	const ago = 11 - user, visit = user + 10, attempt = user + 30;
	add(user, visit, null, 'visit_started', ago); add(user, visit, null, 'page_viewed', ago);
	if (user === 6) continue;
	add(user, visit, attempt, 'lesson_started', ago);
	if (user === 5) continue;
	add(user, visit, attempt, 'lesson_begun', ago); add(user, visit, attempt, 'lesson_progress', ago, { index: 0, total: 2 });
	add(user, visit, attempt, 'mic_requested', ago);
	if (user <= 3) add(user, visit, attempt, 'obstacle', ago, { code: 'mic_denied', index: 0 });
	if (user === 4) continue;
	add(user, visit, attempt, 'mic_requested', ago); add(user, visit, attempt, 'mic_ready', ago);
	add(user, visit, attempt, 'answer_submitted', ago, { index: 0, correct: false });
	add(user, visit, attempt, 'answer_submitted', ago, { index: 0, correct: true });
	add(user, visit, attempt, 'audio_replayed', ago, { index: 0 });
	add(user, visit, attempt, 'lesson_active', ago, { index: 0, active_ms: 15000 });
	if (user === 1) {
		add(user, visit, attempt, 'lesson_progress', ago, { index: 1, total: 2 });
		add(user, visit, attempt, 'hint_opened', ago, { index: 1 });
		add(user, visit, attempt, 'answer_revealed', ago, { index: 1 });
		add(user, visit, attempt, 'step_skipped', ago, { index: 1 });
		add(user, visit, attempt, 'lesson_active', ago, { index: 1, active_ms: 15000 });
		add(user, visit, attempt, 'lesson_attempt_completed', ago);
	}
	add(user, visit, attempt, 'page_hidden', ago);
	const nextAttempt = user === 1 ? attempt + 200 : attempt;
	add(user, visit + 50, nextAttempt, 'visit_started', ago - 2);
	add(user, visit + 50, nextAttempt, 'lesson_started', ago - 2);
	add(user, visit + 50, nextAttempt, user === 1 ? 'lesson_begun' : 'lesson_resumed', ago - 2, { index: 1 });
	add(user, visit + 50, nextAttempt, 'lesson_progress', ago - 2, { index: 1, total: 2 });
	add(user, visit + 50, nextAttempt, 'hint_opened', ago - 2, { index: 1 });
	add(user, visit + 50, nextAttempt, 'answer_submitted', ago - 2, { index: 1, correct: true });
	add(user, visit + 50, nextAttempt, 'lesson_active', ago - 2, { index: 1, active_ms: 15000 });
	add(user, visit + 50, nextAttempt, 'lesson_attempt_completed', ago - 2);
}
const exclusions = new Set([id(8)]);
const assessments = [1,2,3].flatMap(user => {
	const base = { id: id(800 + user), user_id: id(user), protocol: 'de-check-v1', checkpoint: 0, form: user % 2 ? 'b' : 'a', baseline_id: null, started_at: iso(user === 3 ? 5 : 20), completed_at: iso(user === 3 ? 5 : 20,120), listening_correct: 2, reading_correct: 3, skipped: 2 };
	return user === 3 ? [base] : [base, { ...base, id: id(810 + user), checkpoint:14, form:user%2?'a':'b', baseline_id:base.id, started_at:iso(5), completed_at:iso(5,180), listening_correct:4, reading_correct:5, skipped:0 }];
});
const acquisition = [1,2,3,4].map(user => ({ user_id:id(user), source:user<=2?'google':'friend', method:'tag', captured_at:users[user-1].created_at, recorded_at:users[user-1].created_at, new_account:true }));
const changes = [{ id:id(901), title:'Fictional: shorter lesson introduction', hypothesis:'Reducing setup steps may help new learners finish a lesson.', shipped_at:iso(16), window_days:7, metric:'completion', created_at:iso(16), updated_at:iso(16), archived:false }];
const server = http.createServer(async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
	res.setHeader('Access-Control-Allow-Headers', '*');
	if (req.method === 'OPTIONS') { res.end(); return; }
	const url = new URL(req.url, origin);
	const respond = (data, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
	if (url.pathname === '/auth/v1/admin/users') { respond({ users, aud: 'authenticated', next_page: null, last_page: 1, total: users.length }); return; }
	if (url.pathname === '/auth/v1/token') {
		let raw = ''; for await (const chunk of req) raw += chunk;
		const body = JSON.parse(raw || '{}');
		if ((body.email !== 'learner@mirifer.local' || body.password !== 'local-preview-only') && body.refresh_token !== 'local-fixture-refresh') { respond({ error: 'Invalid local credentials' }, 400); return; }
		respond({ access_token: accessToken, refresh_token: 'local-fixture-refresh', expires_in: 86400, token_type: 'bearer', user: learner }); return;
	}
	if (url.pathname === '/auth/v1/user') { respond(req.headers.authorization === `Bearer ${accessToken}` ? learner : { message: 'No session' }, req.headers.authorization === `Bearer ${accessToken}` ? 200 : 401); return; }
	const table = url.pathname.split('/').at(-1);
	const phaseTables = { analytics_assessments:assessments, analytics_acquisition:acquisition, analytics_changes:changes };
	const matches = row => [...url.searchParams].every(([field, filter]) => {
		if (filter.startsWith('eq.')) return String(row[field]) === filter.slice(3);
		if (filter === 'is.null') return row[field] == null;
		if (filter.startsWith('lte.')) return row[field] <= filter.slice(4);
		return true;
	});
	if (phaseTables[table] && !['GET','HEAD'].includes(req.method)) {
		if (req.headers.authorization !== 'Bearer local-preview-service') { respond({message:'Server-only fixture write'},403); return; }
		let raw = ''; for await (const chunk of req) raw += chunk;
		const input = JSON.parse(raw || '{}'), list = phaseTables[table];
		let affected = [];
		if (req.method === 'PATCH') { affected = list.filter(matches); affected.forEach(row => Object.assign(row,input)); }
		else {
			const duplicate = table === 'analytics_acquisition' ? list.find(a => a.user_id === input.user_id)
				: table === 'analytics_assessments' ? list.find(a => a.user_id === input.user_id && a.protocol === input.protocol && a.checkpoint === input.checkpoint) : null;
			if (duplicate && !req.headers.prefer?.includes('ignore-duplicates')) { respond({code:'23505'},409); return; }
			if (!duplicate) {
				const row = { id:crypto.randomUUID(), ...input };
				if (table === 'analytics_assessments') Object.assign(row,{started_at:new Date().toISOString(),completed_at:null,listening_correct:null,reading_correct:null,skipped:null});
				if (table === 'analytics_acquisition') row.recorded_at = new Date().toISOString();
				if (table === 'analytics_changes') Object.assign(row,{created_at:new Date().toISOString(),archived:false});
				list.push(row); affected = [row];
			}
		}
		respond(req.headers.accept?.includes('vnd.pgrst.object') ? affected[0] ?? null : affected, req.method === 'POST' ? 201 : 200); return;
	}
	if (table === 'analytics_exclusions' && req.method !== 'GET' && req.method !== 'HEAD') {
		if (req.method === 'DELETE') exclusions.delete(url.searchParams.get('user_id')?.replace('eq.', ''));
		else { let raw = ''; for await (const chunk of req) raw += chunk; const body = JSON.parse(raw); exclusions.add(body.user_id); }
		res.statusCode = 204; res.end(); return;
	}
	if (table === 'events' && req.method === 'POST') {
		if (req.headers.authorization !== `Bearer ${accessToken}`) { respond({ message: 'Unauthenticated fixture write' }, 401); return; }
		let raw = ''; for await (const chunk of req) raw += chunk;
		const incoming = JSON.parse(raw);
		for (const event of incoming) if (event.user_id === learner.id && !events.some(e => e.event_id === event.event_id)) events.push({ ...event, id: ++seq, created_at: new Date().toISOString() });
		res.statusCode = 201; res.end(); return;
	}
	if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 204; res.end(); return; }
	let rows = table === 'analytics_settings' ? [{ id: true, installed_at: iso(45), schema_version: 2 }]
		: table === 'user_profiles' ? users.map(u => ({ id: u.id, is_admin: u.id === id(9), display_name: 'Preview Learner', language: 'en' }))
		: table === 'analytics_exclusions' ? [...exclusions].map(user_id => ({ user_id }))
		: phaseTables[table] ? phaseTables[table] : table === 'lessons' ? lessons : table === 'sentences' ? sentences
		: table === 'events' ? events : [];
	rows = rows.filter(matches);
	if (url.searchParams.has('order')) { const field = url.searchParams.get('order').split('.')[0]; rows = [...rows].sort((a,b) => String(a[field]).localeCompare(String(b[field]))); }
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
