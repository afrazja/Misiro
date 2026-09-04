<script lang="ts">
	import { onMount } from "svelte";
	import GoogleSignIn from "$components/GoogleSignIn.svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { preferencesStore } from "$stores/preferences";
	import type { Language } from "$stores/preferences";
	import * as auth from "$services/auth";
	import * as dataLayer from "$services/data-layer";
	import { getDueCount } from "$services/spaced-repetition";
	import { initSyncListeners } from "$services/sync-queue";
	import {
		getLessonIndex,
		loadLesson,
		resolveResumePoint,
		type LessonMeta,
	} from "$services/lesson-loader";
	import {
		tierForDay,
		TIER_LABELS,
	} from "$services/curriculum";
	import { lessonMinutes } from "$services/lesson-duration";
	import {
		computeReadiness,
		READINESS_MODULES,
		READINESS_LABELS,
		type Readiness,
	} from "$services/readiness";
	import type { ExamSettings } from "$services/data-layer";
	import { computeStreak } from "$utils/streak";
	import Heatmap from "$lib/components/Heatmap.svelte";
	import TrophyCabinet from "$lib/components/TrophyCabinet.svelte";
	import InstallAppButton from "$lib/components/InstallAppButton.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import AppHeader from "$lib/components/AppHeader.svelte";

	// Auth modal state
	let showAuthModal = $state(false);
	let authMode = $state<"signin" | "signup">("signin");
	let authEmail = $state("");
	let authPassword = $state("");
	let authName = $state("");
	let authError = $state("");
	let authLoading = $state(false);

	// Confirmation toast
	let showConfirmToast = $state(false);

	// Language
	let language = $state<Language>("en");

	// Profile
	let displayName = $state("Learner");
	let avatarUrl = $state<string | null>(null);
	let isAuthenticated = $state(false);

	// Progress stats
	let daysCompleted = $state(0);
	let currentDay = $state(1);
	let streakCount = $state(0);

	// Goethe hero
	let readiness = $state<Readiness | null>(null);
	/** Estimated minutes for today's lesson, from its actual content. */
	let todayMinutes = $state<number | null>(null);

	/** "middle A2" — where today's day sits, so the level is legible at a glance. */
	const todayTier = $derived.by(() => {
		const t = tierForDay(currentDay);
		if (!t) return null;
		const label = TIER_LABELS[t.tier][language === "fa" ? "fa" : "en"];
		return language === "fa" ? `${t.level} ${label}` : `${label} ${t.level}`;
	});
	/** Nothing graded anywhere yet — the whole card is inference. Once even
	 *  one bar is backed by real answers the blanket note would be a lie, and
	 *  the per-bar tags say it better anyway. */
	const allEstimated = $derived(
		!!readiness &&
			READINESS_MODULES.every((m) => readiness!.modules[m].source === "estimate"),
	);
	let examSettings = $state<ExamSettings | null>(null);
	let deadline = $state<{ days: number; kind: "exam" | "target" } | null>(
		null,
	);
	let showDatePanel = $state(false);
	let heroDate = $state("");
	const toISO = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	const minHeroDate = toISO(new Date(Date.now() + 86400000));
	const maxHeroDate = toISO(new Date(Date.now() + 2 * 365 * 86400000));

	let totalXp = $state(0);
	let dueReviews = $state(0);
	let savedWordCount = $state(0);
	let totalLessons = $state(0);
	let completedLessons = $state<
		Record<number, { completedAt: number; sentenceCount: number }>
	>({});
	let lessonMetaIndex = $state<LessonMeta[]>([]);
	let progressLoaded = $state(false);

	// Today's-session hero: what one tap on /lesson will run
	// Day-zero users get ONE door, not seven: the full dashboard (hero bars,
	// stats, nav cards) unlocks after the first completed lesson.
	const isNewUser = $derived(
		isAuthenticated && progressLoaded && daysCompleted === 0,
	);

	const todayTitle = $derived.by(() => {
		const m = lessonMetaIndex.find((meta) => meta.day === currentDay);
		if (!m) return "";
		// titleFa is the bare topic ("خرید آنلاین"); title carries the
		// "82: Online Shopping" prefix — compose fa to match that shape.
		if (language === "fa" && m.titleFa) return `${m.day}: ${m.titleFa}`;
		return m.title;
	});

	// Badges & Calendar expansion
	let showCalendar = $state(false);
	let showBadges = $state(false);
	let showProfileMenu = $state(false);
	let profileMenuEl = $state<HTMLDivElement | null>(null);
	let unlockedBadges = $state<string[]>([]);
	let unreadBadgesCount = $state(0);
	let sentenceStats = $state<Record<string, number>>({ A1: 0, A2: 0, B1: 0 });

	// Refs for focus trap
	let modalEl: HTMLDivElement | undefined = $state();
	let emailInput: HTMLInputElement | undefined = $state();

	// Derived: gamified level based on XP
	const TIER_A1 = 0;
	const TIER_A2 = 1500;
	const TIER_B1 = 4500;

	const currentLevel = $derived.by(() => {
		if (totalXp >= TIER_B1) return "B1+";
		if (totalXp >= TIER_A2) return "A2";
		return "A1";
	});

	// How far along are they to the NEXT tier?
	const levelPercent = $derived.by(() => {
		if (totalXp >= TIER_B1) return 100; // Maxed out
		if (totalXp >= TIER_A2)
			return Math.round(
				((totalXp - TIER_A2) / (TIER_B1 - TIER_A2)) * 100,
			);
		return Math.round((totalXp / TIER_A2) * 100);
	});

	const nextTierXp = $derived.by(() => {
		if (totalXp >= TIER_B1) return "Max";
		if (totalXp >= TIER_A2) return TIER_B1;
		return TIER_A2;
	});

	const progressPercent = $derived(
		totalLessons > 0 ? Math.round((daysCompleted / totalLessons) * 100) : 0,
	);


	// ── Practice Calendar ──────────────────────────────
	let calYear = $state(new Date().getFullYear());
	let calMonth = $state(new Date().getMonth()); // 0-indexed

	const MONTH_NAMES = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	// Gregorian months, Persian names (the calendar stays Gregorian —
	// exam dates and lesson history are Gregorian).
	const MONTH_NAMES_FA = [
		"ژانویه",
		"فوریه",
		"مارس",
		"آوریل",
		"مه",
		"ژوئن",
		"ژوئیه",
		"اوت",
		"سپتامبر",
		"اکتبر",
		"نوامبر",
		"دسامبر",
	];

	// Set of YYYY-MM-DD strings for days the user completed at least one lesson
	const practiceDates = $derived.by(() => {
		const s = new Set<string>();
		for (const entry of Object.values(completedLessons)) {
			if (entry.completedAt) {
				const d = new Date(entry.completedAt);
				s.add(
					`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
				);
			}
		}
		return s;
	});

	// Count of distinct practice days in the current calendar month
	const thisMonthPracticed = $derived.by(() => {
		const now = new Date();
		const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
		let count = 0;
		for (const k of practiceDates) {
			if (k.startsWith(prefix)) count++;
		}
		return count;
	});

	function buildCalCells(
		year: number,
		month: number,
	): { day: number | null; key: string | null; isToday: boolean }[] {
		const today = new Date();
		const firstDow = new Date(year, month, 1).getDay(); // 0 = Sunday
		const startOffset = (firstDow + 6) % 7; // shift so Mon = 0
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const cells: {
			day: number | null;
			key: string | null;
			isToday: boolean;
		}[] = [];
		for (let i = 0; i < startOffset; i++)
			cells.push({ day: null, key: null, isToday: false });
		for (let d = 1; d <= daysInMonth; d++) {
			const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			const isToday =
				today.getFullYear() === year &&
				today.getMonth() === month &&
				today.getDate() === d;
			cells.push({ day: d, key, isToday });
		}
		return cells;
	}

	function prevCalMonth() {
		if (calMonth === 0) {
			calMonth = 11;
			calYear--;
		} else calMonth--;
	}

	function nextCalMonth() {
		const now = new Date();
		if (
			calYear > now.getFullYear() ||
			(calYear === now.getFullYear() && calMonth >= now.getMonth())
		)
			return;
		if (calMonth === 11) {
			calMonth = 0;
			calYear++;
		} else calMonth++;
	}

	// i18n content
	const content = $derived({
		langLabel: language === "fa" ? "زبان:" : "Language:",
		lessonsTitle: language === "fa" ? "درس‌های روزانه" : "Daily Lessons",
		lessonsDesc:
			language === "fa"
				? "مکالمات واقعی آلمانی را تمرین کنید. هر روز سناریوهای جدید مثل سفارش در کافه، پرسیدن مسیر و موارد دیگر."
				: "Practice real-world conversations. Each day brings new scenarios like ordering at a café, asking for directions, and more.",
		basicsTitle: language === "fa" ? "مبانی آلمانی" : "German Basics",
		basicsDesc:
			language === "fa"
				? "یادگیری اصول اولیه: ضمایر، حروف تعریف، قیدها، اعداد، رنگ‌ها و روزهای هفته."
				: "Essential building blocks: pronouns, articles, adverbs, numbers, colors, and days of the week.",
	});

	async function loadProgress() {
		// Fault-isolated: one failed fetch must not zero out the others.
		const [completedRes, progressRes, indexRes] = await Promise.allSettled([
			dataLayer.getCompletedLessons(),
			dataLayer.getProgress(),
			getLessonIndex(),
		]);

		const completed =
			completedRes.status === "fulfilled" ? completedRes.value : {};
		completedLessons = completed;
		daysCompleted = Object.keys(completed).length;
		streakCount = computeStreak(completed);


		const progress =
			progressRes.status === "fulfilled" ? progressRes.value : null;
		totalXp = progress?.xp ?? 0;

		// Actual lesson count from database
		const index = indexRes.status === "fulfilled" ? indexRes.value : [];
		totalLessons = index.length;
		lessonMetaIndex = index;

		// "Today's session" — same rule the lesson page uses, so the card and
		// the lesson always agree (mid-lesson resumes; otherwise the lowest
		// not-yet-completed day, never a stale revisit).
		currentDay = resolveResumePoint(progress, completed).day;

		// The minute estimate needs the lesson itself. Fire-and-forget on
		// purpose: it is one line of text, and awaiting it here would let a
		// single slow Supabase read hold up everything behind it.
		void loadLesson(currentDay)
			.then((l) => (todayMinutes = lessonMinutes(l) || null))
			.catch(() => (todayMinutes = null));

		// Goethe hero — exam plan + readiness estimate. Failure just hides
		// the hero; it must never take the dashboard down with it.
		try {
			examSettings = await dataLayer.getExamSettings();
			deadline = dataLayer.examDeadline(examSettings);
			readiness = await computeReadiness();
		} catch {
			readiness = null;
		}

		try {
			dueReviews = await getDueCount();
		} catch {
			dueReviews = 0;
		}
		progressLoaded = true;

		try {
			savedWordCount = dataLayer.getVocabularyCount();
		} catch {
			savedWordCount = 0;
		}

		// Unlock Achievements Engine
		let currentBadges = progress?.achievements
			? [...progress.achievements]
			: [];
		let newlyUnlocked = 0;

		const checkBadge = (id: string, condition: boolean) => {
			if (condition && !currentBadges.includes(id)) {
				currentBadges.push(id);
				newlyUnlocked++;

				// Optional: You could show a specialized toast here
				// showToast(`Unlocked Achievement: ${id}!`);
			}
		};

		checkBadge("first_lesson", daysCompleted >= 1);
		checkBadge("active_learner_5", daysCompleted >= 5);
		checkBadge("polyglot_50", savedWordCount >= 50);
		checkBadge("perfectionist", totalXp >= 1000);

		unlockedBadges = currentBadges;

		if (newlyUnlocked > 0 && progress) {
			await dataLayer.saveProgress(
				currentDay,
				progress.currentSentenceIndex ?? 0,
				totalXp,
				unlockedBadges,
			);
		}

		// Fetch sentence stats
		sentenceStats = await dataLayer.getLearnedSentenceBreakdown();
	}

	function toggleAuthModal() {
		showAuthModal = !showAuthModal;
		authError = "";
		if (showAuthModal) setTimeout(() => emailInput?.focus(), 100);
	}

	function toggleAuthMode() {
		authMode = authMode === "signin" ? "signup" : "signin";
		authError = "";
	}

	async function submitAuth() {
		authError = "";
		if (!authEmail.trim() || !authPassword) {
			authError = "Please enter email and password.";
			return;
		}
		authLoading = true;
		try {
			let result;
			if (authMode === "signup") {
				result = await auth.signUp(
					authEmail.trim(),
					authPassword,
					authName.trim() || "Learner",
				);
			} else {
				result = await auth.signIn(authEmail.trim(), authPassword);
			}
			if (result.error) {
				authError = result.error;
			} else {
				showAuthModal = false;
				authEmail = "";
				authPassword = "";
				authName = "";
				const user = await auth.getUser();
				if (user) await auth.ensureProfile(user);
				await updateProfileUI();
				await dataLayer.syncOnLogin();
				await loadProgress();
			}
		} catch (e: any) {
			authError = e.message || "An error occurred.";
		} finally {
			authLoading = false;
		}
	}

	async function handleSignOut() {
		await auth.signOut();
		window.location.href = "/";
	}

	async function updateProfileUI() {
		const authed = await auth.isAuthenticated();
		isAuthenticated = authed;
		if (authed) {
			displayName = await auth.getDisplayName();
			const url = dataLayer.getAvatarUrl() || (await auth.getAvatarUrl());
			if (url) dataLayer.setAvatarUrl(url);
			avatarUrl = url;
		} else {
			displayName = "Learner";
			avatarUrl = null;
		}
	}


	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && showCalendar) showCalendar = false;
		if (e.key === "Escape" && showAuthModal) toggleAuthModal();
		if (e.key === "Escape" && showProfileMenu) {
			showProfileMenu = false;
			// Send focus back to the trigger, or the tab order restarts at
			// the top of the page.
			profileMenuEl?.querySelector("button")?.focus();
		}
		if (e.key === "Tab" && showAuthModal && modalEl) {
			const focusable = modalEl.querySelectorAll<HTMLElement>(
				'input:not([style*="display:none"]), button, a[href], [tabindex]:not([tabindex="-1"])',
			);
			const visible = Array.from(focusable).filter((el) => {
				let p: HTMLElement | null = el;
				while (p && p !== modalEl) {
					if (p.style && p.style.display === "none") return false;
					p = p.parentElement as HTMLElement;
				}
				return true;
			});
			if (!visible.length) return;
			const first = visible[0];
			const last = visible[visible.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	function handleAuthKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") submitAuth();
	}

	onMount(async () => {
		initSyncListeners();

		const params = $page.url.searchParams;
		if (params.get("confirmed") === "true") {
			showConfirmToast = true;
			setTimeout(() => (showConfirmToast = false), 5000);
			goto("/home", { replaceState: true });
		}

		const savedLang = await dataLayer.getLanguage();
		if (savedLang) {
			language = savedLang as Language;
		} else {
			const browserLang = navigator.language || "en";
			language = browserLang.startsWith("fa") ? "fa" : "en";
		}
		preferencesStore.update((s) => ({ ...s, language }));

		await updateProfileUI();
		await loadProgress();
	});
</script>

<svelte:window
	onkeydown={handleKeydown}
	onpointerdown={(e) => {
		// Close on any tap outside. Checking containment first means the
		// trigger's own click still toggles instead of closing and reopening.
		if (showProfileMenu && profileMenuEl && !profileMenuEl.contains(e.target as Node)) {
			showProfileMenu = false;
		}
	}}
/>

<svelte:head>
	<title>Mirifer – My Dashboard</title>
</svelte:head>

<!-- Confirmation Toast -->
<div class="confirm-toast" class:show={showConfirmToast}>
	✅ Email confirmed! You can now sign in.
</div>

<!-- Auth Modal -->
{#if showAuthModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="auth-overlay"
		role="dialog"
		aria-modal="true"
		aria-labelledby="auth-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) toggleAuthModal();
		}}
	>
		<div class="auth-modal" bind:this={modalEl}>
			<button
				class="auth-close"
				onclick={toggleAuthModal}
				aria-label="Close dialog">×</button
			>
			<h2 id="auth-title">
				{authMode === "signin" ? "Sign In" : "Sign Up"}
			</h2>
			{#if authError}
				<div class="auth-error">{authError}</div>
			{/if}
			{#if authMode === "signup"}
				<div class="auth-field">
					<input
						type="text"
						placeholder="Display Name"
						aria-label="Display Name"
						bind:value={authName}
						onkeydown={handleAuthKeydown}
					/>
				</div>
			{/if}
			<div class="auth-field">
				<input
					type="email"
					placeholder="Email"
					aria-label="Email address"
					bind:this={emailInput}
					bind:value={authEmail}
					onkeydown={handleAuthKeydown}
				/>
			</div>
			<div class="auth-field">
				<input
					type="password"
					placeholder="Password"
					aria-label="Password"
					bind:value={authPassword}
					onkeydown={handleAuthKeydown}
				/>
			</div>
			<button
				class="auth-submit"
				onclick={submitAuth}
				disabled={authLoading}
			>
				{authLoading
					? "..."
					: authMode === "signin"
						? "Sign In"
						: "Sign Up"}
			</button>
			<GoogleSignIn
				next="/home"
				lang={language}
				onError={(m) => (authError = m)}
			/>
			{#if authMode === "signin"}
				<!-- Third separate sign-in form. Links to /login's reset mode
				     rather than growing its own copy of the flow. -->
				<p class="auth-forgot">
					<a href="/login?mode=reset">
						{language === "fa"
							? "رمز عبورت را فراموش کرده‌ای؟"
							: "Forgot your password?"}
					</a>
				</p>
			{/if}
			<p class="auth-toggle">
				<span
					>{authMode === "signin"
						? "Don't have an account?"
						: "Already have an account?"}</span
				>
				<!-- svelte-ignore a11y_invalid_attribute -->
				<a
					href="#"
					onclick={(e) => {
						e.preventDefault();
						toggleAuthMode();
					}}
				>
					{authMode === "signin" ? " Sign Up" : " Sign In"}
				</a>
			</p>
		</div>
	</div>
{/if}

<!-- ── Trophy Cabinet Overlay ────────────────────────── -->
{#if showBadges}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="cal-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Trophy Cabinet"
		onclick={(e) => {
			if (e.target === e.currentTarget) showBadges = false;
		}}
	>
		<div class="cal-modal">
			<button
				class="cal-close"
				onclick={() => (showBadges = false)}
				aria-label="Close cabinet">×</button
			>
			<div class="cal-header">
				<h2>🏆 My Achievements</h2>
				<p>Your journey and mastery level at a glance.</p>
			</div>

			<div class="stats-overview">
				<div class="mastery-section">
					<h3>Sentence Mastery</h3>
					<div class="mastery-grid">
						<div class="mastery-item a1">
							<span class="m-label">A1</span>
							<span class="m-value">{sentenceStats.A1 || 0}</span>
							<span class="m-sub">Beginner</span>
						</div>
						<div class="mastery-item a2">
							<span class="m-label">A2</span>
							<span class="m-value">{sentenceStats.A2 || 0}</span>
							<span class="m-sub">Elementary</span>
						</div>
						<div class="mastery-item b1">
							<span class="m-label">B1</span>
							<span class="m-value">{sentenceStats.B1 || 0}</span>
							<span class="m-sub">Intermediate</span>
						</div>
					</div>
				</div>
			</div>

			<TrophyCabinet unlockedIds={unlockedBadges} />
		</div>
	</div>
{/if}

<!-- ── 60-Day Calendar Flashcard ───────────────────── -->
{#if showCalendar}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="cal-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="60-Day Journey Calendar"
		onclick={(e) => {
			if (e.target === e.currentTarget) showCalendar = false;
		}}
	>
		<div class="cal-modal">
			<button
				class="cal-close"
				onclick={() => (showCalendar = false)}
				aria-label="Close calendar">×</button
			>

			<div class="cal-header">
				<h2>
					📅 {language === "fa" ? "تقویم تمرین" : "Practice Calendar"}
				</h2>
				<p>
					{#if language === "fa"}
						{daysCompleted} درس کامل شده
						{#if streakCount > 0}
							· {streakCount} روز پشت‌سرهم 🔥{/if}
					{:else}
						{daysCompleted} lesson{daysCompleted === 1 ? "" : "s"} completed
						{#if streakCount > 0}
							· {streakCount}-day streak 🔥{/if}
					{/if}
				</p>
			</div>

			<!-- Month navigation -->
			<div class="pcal-header">
				<button
					class="pcal-nav-btn"
					onclick={prevCalMonth}
					aria-label="Previous month">‹</button
				>
				<span class="pcal-title"
					>{(language === "fa" ? MONTH_NAMES_FA : MONTH_NAMES)[
						calMonth
					]}
					{calYear}</span
				>
				<button
					class="pcal-nav-btn"
					onclick={nextCalMonth}
					disabled={calYear === new Date().getFullYear() &&
						calMonth >= new Date().getMonth()}
					aria-label="Next month">›</button
				>
			</div>

			<!-- Day-of-week headers -->
			<div class="pcal-dow">
				{#each language === "fa" ? ["د", "س", "چ", "پ", "ج", "ش", "ی"] : ["M", "T", "W", "T", "F", "S", "S"] as label}
					<span class="pcal-dow-cell">{label}</span>
				{/each}
			</div>

			<!-- Calendar day cells -->
			<div class="pcal-grid">
				{#each buildCalCells(calYear, calMonth) as cell}
					{#if cell.day === null}
						<span class="pcal-cell pcal-empty"></span>
					{:else}
						<span
							class="pcal-cell"
							class:practiced={practiceDates.has(cell.key!)}
							class:today={cell.isToday}
							title={practiceDates.has(cell.key!)
								? language === "fa"
									? `تمرین در ${new Date(cell.key!).toLocaleDateString("fa-IR", { month: "long", day: "numeric" })}`
									: `Practiced on ${new Date(cell.key!).toLocaleDateString("en", { month: "long", day: "numeric" })}`
								: cell.isToday
									? language === "fa"
										? "امروز"
										: "Today"
									: ""}>{cell.day}</span
						>
					{/if}
				{/each}
			</div>

			<!-- Legend -->
			<div class="cal-legend">
				<span class="leg-item"
					><span class="leg-sw practiced-sw"></span>{language === "fa"
						? "تمرین‌شده"
						: "Practiced"}</span
				>
				<span class="leg-item"
					><span class="leg-sw today-sw"></span>{language === "fa"
						? "امروز"
						: "Today"}</span
				>
				<span class="leg-item pcal-month-stat">
					{#if language === "fa"}
						{thisMonthPracticed} روز در این ماه
					{:else}
						{thisMonthPracticed} day{thisMonthPracticed !== 1
							? "s"
							: ""} this month
					{/if}
				</span>
			</div>
		</div>
	</div>
{/if}

<!--
	Dashboard shell — the redesign's left rail beside the existing content.

	The rail is the one structural addition the artboard makes; everything
	it links to already existed, scattered across cards further down the
	page. Desktop only: on a phone the same destinations are the cards
	themselves, and a rail would cost a third of the screen to repeat them.
-->
<div class="dash-shell">
	{#if isAuthenticated && !isNewUser}
		<aside class="rail" aria-label="Dashboard sections">
			<a class="rail-brand" href="/">
				<span class="rail-mark" aria-hidden="true"></span>
				<span>Mirifer</span>
			</a>
			<nav class="rail-nav">
				<a class="rail-item is-current" href="/home" aria-current="page">
					<span aria-hidden="true">◆</span>{language === "fa" ? "امروز" : "Today"}
				</a>
				<a class="rail-item" href="/lesson">
					<span aria-hidden="true">▸</span>{language === "fa" ? "درس‌های روزانه" : "Daily lessons"}
				</a>
				<!-- Only when there is something to review. A new account has
				     nothing due, so this link led straight to "No items due for
				     review" — a dead end that makes the app feel emptier rather
				     than lighter, on the screen where first impressions are made. -->
				{#if dueReviews > 0}
					<a class="rail-item" href="/review">
						<span aria-hidden="true">↻</span>{language === "fa" ? "مرورها" : "Reviews"}
						<em class="rail-count">{dueReviews}</em>
					</a>
				{/if}
				<a class="rail-item" href={language === "fa" ? "/fa/basics" : "/basics"}>
					<span aria-hidden="true">▤</span>{language === "fa" ? "گرامر آلمانی" : "German Basics"}
				</a>
				<a class="rail-item" href="/vocabulary">
					<span aria-hidden="true">★</span>{language === "fa" ? "کلمه‌های ذخیره‌شده" : "Saved words"}
				</a>
			</nav>
		</aside>
	{/if}

<main class="home-container">
	{#snippet profileLeading()}
		{#if isAuthenticated}
			<!-- Account actions live behind the avatar. They used to sit loose
			     in the toolbar as a gear and a Sign Out button, which put a
			     destructive action one stray tap away and — because the gear
			     glyph is a ring of straight rays — read as a second sun next
			     to the actual theme toggle. -->
			<div class="nav-profile" bind:this={profileMenuEl}>
				<button
					type="button"
					class="nav-profile-brand"
					aria-haspopup="menu"
					aria-expanded={showProfileMenu}
					onclick={() => (showProfileMenu = !showProfileMenu)}
				>
					<div class="brand-avatar">
						{#if avatarUrl}
							<img src={avatarUrl} alt="" />
						{:else}
							{(displayName || "L").charAt(0).toUpperCase()}
						{/if}
					</div>
					<span class="brand-text">{displayName}</span>
					<span class="brand-caret" class:open={showProfileMenu} aria-hidden="true"
						>▾</span
					>
				</button>

				{#if showProfileMenu}
					<div class="profile-menu" role="menu">
						<a
							href="/settings"
							role="menuitem"
							class="profile-menu-item"
							onclick={() => (showProfileMenu = false)}
						>
							<Icon name="gear" size={17} />
							<span>{language === "fa" ? "تنظیمات" : "Settings"}</span>
						</a>
						<button
							type="button"
							role="menuitem"
							class="profile-menu-item danger"
							onclick={() => {
								showProfileMenu = false;
								handleSignOut();
							}}
						>
							<span class="pm-glyph" aria-hidden="true">⎋</span>
							<span>{language === "fa" ? "خروج" : "Sign Out"}</span>
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<span class="nav-profile-brand static">
				<div class="brand-avatar">
					{(displayName || "L").charAt(0).toUpperCase()}
				</div>
				<span class="brand-text">{displayName}</span>
			</span>
		{/if}
	{/snippet}

	{#snippet homeHeaderActions()}
		<div class="nav-right">
			<InstallAppButton />
			{#if isAuthenticated}
				<div class="nav-stats">
					<button
						class="nav-stat xp"
						onclick={() => (showBadges = true)}
						title="View XP & Badges"
					>
						<span class="ns-icon star"><Icon name="star" size={16} /></span>
						<span class="ns-value">{totalXp}</span>
					</button>
					{#if streakCount > 0}
						<!-- A zeroed flame is a shame counter, not motivation —
						     show the streak only once there is one. -->
						<button
							class="nav-stat streak"
							onclick={() => (showCalendar = true)}
							title="View Streak History"
						>
							<span class="ns-icon flame"><Icon name="flame" size={16} /></span>
							<span class="ns-value">{streakCount}</span>
						</button>
					{/if}
				</div>

				<!-- Settings and Sign Out moved into the avatar menu. -->
			{:else}
				<button class="nav-text-btn" onclick={toggleAuthModal}
					>{language === "fa" ? "ورود" : "Sign In"}</button
				>
			{/if}
		</div>
	{/snippet}

	<AppHeader leading={profileLeading} actions={homeHeaderActions} variant="dark" />

	<!-- Skip-link target: absolutely positioned, so it adds no box. -->
	<span id="main-content" tabindex="-1" class="sr-only"></span>


	<!-- ── First Step (day-zero users): one door only ──── -->
	{#if isNewUser}
		<div class="first-step">
			{#if deadline !== null && deadline.days >= 0}
				<span class="fs-countdown">
					⏳ {language === "fa"
						? `${deadline.days} روز تا ${deadline.kind === "exam" ? "آزمون" : "هدفت"}`
						: `${deadline.days} days to your ${deadline.kind === "exam" ? "exam" : "target"}`}
				</span>
			{/if}
				<h2 class="fs-title">
					{language === "fa" ? "آماده‌ای؟ درس اول" : "Ready? Your first lesson"}
				</h2>
				<p class="fs-sub">
					{language === "fa"
						? "روزی یک درس کوتاه — از همین امروز."
						: "One short lesson a day — starting now."}
				</p>
				<a class="fs-primary" href="/lesson">
					▶ {language === "fa" ? "شروع" : "Start"}
					{language === "fa" ? "روز" : "Day"}
					{todayTitle || currentDay}
				</a>
				<a class="fs-secondary" href="/drill/sprechen">
					🎙 {language === "fa"
						? "یا تمرین Sprechen ←"
						: "or the Sprechen drill →"}
				</a>
		</div>
	{/if}


	<!-- ── Today's Session (primary daily action) ──────── -->
	{#if isAuthenticated && !isNewUser}
		<a href="/lesson" class="today-session" title="Start today's session">
			<div class="today-info">
				<span class="today-label">
					{language === "fa" ? "جلسه امروز" : "TODAY'S SESSION"}
				</span>
				{#if progressLoaded}
					<!-- No review count here: the lesson no longer starts with a
					     warm-up, so promising one would be a lie. Reviews have
					     their own card below. -->
					<span class="today-title">
						{language === "fa" ? "روز" : "Day"}
						{todayTitle || currentDay}
					</span>
					<!-- Estimated from what the lesson actually contains, so it
					     cannot drift from the content the way a hardcoded
					     "~5–10 minutes" on every day of the course did. -->
					<span class="today-sub">
						{#if todayMinutes}
							{language === "fa"
								? `حدود ${todayMinutes} دقیقه`
								: `~${todayMinutes} min`}{#if todayTier}<span class="today-tier"
									>· {todayTier}</span
								>{/if}
						{:else if todayTier}
							{todayTier}
						{/if}
					</span>
				{:else}
					<span class="today-title today-loading">
						{language === "fa" ? "در حال بارگذاری…" : "Loading…"}
					</span>
				{/if}
			</div>
			<span class="today-btn">
				▶ {language === "fa"
					? "شروع جلسه امروز"
					: "Start Today's Session"}
			</span>
		</a>
	{/if}

	<!-- ── Progress Stats ──────────────────────────────── -->
	{#if isAuthenticated && !isNewUser}
		<div class="stats-row action-row">
			<a
				href="/vocabulary"
				class="stat-card stat-card-link action-card"
				class:has-words={savedWordCount > 0}
				title="View saved vocabulary"
			>
				<span class="stat-icon warm"><Icon name="bookmark" size={26} /></span>
				<div class="stat-content">
					<span class="stat-value">{savedWordCount}</span>
					<span class="stat-label"
						>{language === "fa" ? "واژه‌های ذخیره‌شده" : "Saved Words"}</span
					>
				</div>
				{#if savedWordCount > 0}
					<span class="stat-cta vocab-cta"
						>{language === "fa" ? "تمرین ←" : "Practice →"}</span
					>
				{/if}
			</a>


			<a
				href="/drill/sprechen"
				class="stat-card stat-card-link action-card"
				title={language === "fa" ? "تمرین Sprechen" : "Sprechen drill"}
			>
				<span class="stat-icon aim" aria-hidden="true">🎙</span>
				<div class="stat-content">
					<span class="stat-label strong"
						>{language === "fa" ? "تمرین Sprechen" : "Sprechen drill"}</span
					>
					<span class="stat-sub"
						>{language === "fa" ? "معرفی خود" : "Introduce yourself"}</span
					>
				</div>
				<span class="stat-cta"
					>{language === "fa" ? "تمرین ←" : "Practice →"}</span
				>
			</a>
		</div>
	{/if}

	<!-- ── Nav Cards ───────────────────────────────────── -->
	{#if !isNewUser}
		<div class="nav-cards" id="categories-grid">
		<a href="/lesson" class="nav-card lessons">
			<div class="card-glow"></div>
			<div class="icon"><Icon name="book" size={44} /></div>
			<h2>{content.lessonsTitle}</h2>
			<p>{content.lessonsDesc}</p>
			{#if isAuthenticated}
				{#if totalLessons > 0 && daysCompleted >= totalLessons}
					<div class="card-meta done">
						{language === "fa"
							? `🎉 هر ${totalLessons} روز کامل شد!`
							: `🎉 All ${totalLessons} days complete!`}
					</div>
					<div class="card-progress-bar">
						<div
							class="card-progress-fill"
							style="width: 100%"
						></div>
					</div>
				{:else if daysCompleted > 0}
					<div class="card-meta">
						{#if totalLessons > 0}
							{#if language === "fa"}
								{daysCompleted} از {totalLessons} روز · ٪{progressPercent}
							{:else}
								{daysCompleted} of {totalLessons} days · {progressPercent}%
							{/if}
						{:else if language === "fa"}
							{daysCompleted} روز انجام شده
						{:else}
							{daysCompleted} days done
						{/if}
					</div>
					<div class="card-progress-bar">
						<div
							class="card-progress-fill"
							style="width: {progressPercent}%"
						></div>
					</div>
				{:else}
					<div class="card-meta">
						{language === "fa" ? "شروع روز ۱ ←" : "Start Day 1 →"}
					</div>
				{/if}
			{/if}
			<div class="arrow">→</div>
		</a>

		<a href="/basics" class="nav-card basics">
			<div class="card-glow"></div>
			<div class="icon"><Icon name="letters" size={44} /></div>
			<h2>{content.basicsTitle}</h2>
			<p>{content.basicsDesc}</p>
			<div class="card-meta basics-meta">
				{language === "fa"
					? "۱۲ مبحث · ضمایر، حروف تعریف و بیشتر"
					: "12 topics · Pronouns, Articles & more"}
			</div>
			<div class="arrow">→</div>
		</a>
		</div>
	{/if}

</main>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}






	:global(body) {
		background: var(--paper);
	}






	/* ── Dashboard shell + left rail ─────────────────── */
	.dash-shell {
		display: block;
	}






	.rail {
		display: none;
	}






	/* The rail only earns its width when there is width to spare. Below
	   this the same destinations are the cards in the page itself, so a
	   rail would be a third of a phone screen spent repeating them. */
	@media (min-width: 1080px) {
		.dash-shell {
			display: grid;
			grid-template-columns: 232px minmax(0, 1fr);
			align-items: start;
			max-width: 1340px;
			margin-inline: auto;
		}

		.rail {
			display: flex;
			flex-direction: column;
			gap: var(--space-6);
			position: sticky;
			top: 0;
			block-size: 100vh;
			padding: 28px 20px;
			border-inline-end: 1px solid var(--line);
		}

		.home-container {
			margin: 0;
			max-width: none;
		}
	}






	.rail-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--ink);
		text-decoration: none;
	}






	.rail-mark {
		inline-size: 22px;
		block-size: 22px;
		border-radius: 7px;
		background: var(--leaf);
		flex: none;
	}






	.rail-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}






	.rail-item {
		display: flex;
		align-items: center;
		gap: 10px;
		min-block-size: 44px;
		padding: 0 12px;
		border-radius: var(--radius-control);
		color: var(--ink-soft);
		text-decoration: none;
		font-size: 0.94rem;
	}






	.rail-item span {
		color: var(--ink-faint);
		font-size: 0.8rem;
	}






	.rail-item:hover {
		background: var(--control-hover);
		color: var(--ink);
	}






	.rail-item.is-current {
		background: var(--accent-wash);
		color: var(--accent);
		font-weight: 600;
	}






	.rail-item.is-current span {
		color: var(--accent);
	}






	/* Sits at the end of the row in either direction. */
	.rail-count {
		margin-inline-start: auto;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-style: normal;
		background: var(--attention-wash);
		color: var(--attention);
		border-radius: var(--radius-pill);
		padding: 2px 8px;
	}






	.home-container {
		max-width: 1100px;
		margin: 0 auto;
		padding: 28px 24px 40px;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 28px;
		font-family: var(--font-body);
		color: var(--ink);
		--install-bg: var(--leaf-wash);
		--install-border: var(--leaf);
		--install-fg: var(--leaf);
	}






	.nav-profile {
		position: relative;
	}






	.nav-profile-brand {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 4px 8px;
		border: none;
		border-radius: 12px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: start;
		text-decoration: none;
		cursor: pointer;
		transition: opacity 0.2s;
	}






	.nav-profile-brand.static {
		cursor: default;
	}






	.nav-profile-brand:hover {
		opacity: 0.8;
	}






	.brand-caret {
		color: var(--on-brand-soft);
		font-size: 0.95rem;
		line-height: 1;
		transition: transform 0.18s ease;
	}






	.brand-caret.open {
		transform: rotate(180deg);
	}






	@media (prefers-reduced-motion: reduce) {
		.brand-caret {
			transition: none;
		}
	}






	/* ── Account menu ── */
	.profile-menu {
		position: absolute;
		top: calc(100% + 6px);
		inset-inline-start: 0;
		z-index: 200;
		min-width: 190px;
		padding: 6px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--paper-raised);
		box-shadow: var(--paper-shadow);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}






	.profile-menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 44px;
		padding: 10px 12px;
		border: none;
		border-radius: 8px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: start;
		text-decoration: none;
		cursor: pointer;
	}






	.profile-menu-item:hover,
	.profile-menu-item:focus-visible {
		background: var(--control-hover);
	}






	/* Signing out is the one destructive thing here — it should not look
	   like the neutral item above it. */
	.profile-menu-item.danger {
		color: var(--miss);
	}






	.profile-menu-item.danger:hover,
	.profile-menu-item.danger:focus-visible {
		background: color-mix(in srgb, var(--miss) 10%, transparent);
	}






	.pm-glyph {
		display: inline-flex;
		width: 17px;
		justify-content: center;
		font-size: 1rem;
	}






	.brand-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--on-accent);
		border: 1.5px solid var(--line);
		overflow: hidden;
	}






	.brand-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}






	.brand-text {
		font-weight: 700;
		font-size: 1rem;
		/* Sits on the dark ribbon, not the page — var(--ink) rendered it
		   invisible (1.02:1) in light mode. */
		color: var(--on-brand);
	}






	.nav-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}






	/* Compact language picker */

	.nav-text-btn {
		padding: 6px 16px;
		border-radius: 20px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink-soft);
		cursor: pointer;
		font-size: 0.84rem;
		font-family: inherit;
		transition: all 0.2s;
	}






	.nav-text-btn:hover {
		border-color: var(--accent);
		color: var(--accent-deep);
		background: var(--accent-wash);
	}






	/* ── Today's Session hero ── */
	.today-session {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 24px 30px;
		border-radius: 18px;
		background: var(--accent);
		text-decoration: none;
		color: var(--on-accent);
		box-shadow: 0 10px 30px rgba(46, 204, 113, 0.28);
		transition:
			transform 0.25s ease,
			box-shadow 0.25s ease;
	}






	.today-session:hover {
		transform: translateY(-3px);
		box-shadow: 0 20px 50px rgba(233, 69, 96, 0.45);
	}






	.today-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}






	.today-label {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 2px;
		opacity: 0.85;
	}






	.today-title {
		font-size: 1.25rem;
		font-weight: 700;
		line-height: 1.35;
	}






	.today-loading {
		opacity: 0.7;
	}






	.today-sub {
		font-size: 0.85rem;
		opacity: 0.8;
	}






	.today-btn {
		flex-shrink: 0;
		background: var(--on-accent);
		color: var(--accent);
		font-weight: 700;
		font-size: 1rem;
		padding: 14px 26px;
		border-radius: 12px;
		white-space: nowrap;
	}






	@media (max-width: 640px) {
		.today-session {
			flex-direction: column;
			align-items: flex-start;
		}

		.today-btn {
			align-self: stretch;
			text-align: center;
		}
	}






	.nav-stats {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-right: 8px;
		/* This pill sits on the dark ribbon, so a light --paper-sunken
		   fill put white numerals on a white background (1.18:1). */
		background: rgba(255, 255, 255, 0.08);
		padding: 4px;
		border-radius: 12px;
		border: 1px solid var(--on-strip-accent);
	}






	.nav-stat {
		background: transparent;
		border: none;
		border-radius: 8px;
		padding: 4px 8px;
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
		color: var(--on-brand);
	}






	.nav-stat:hover {
		background: var(--paper-sunken);
	}






	.ns-icon {
		display: inline-flex;
	}






	/* Gold, and the same gold for the numeral beside it, so the XP badge
	   reads as one thing. The star was var(--accent) — deep forest green on
	   a near-black pill, measured 1.8:1 on the live page, which is why it
	   looked like nothing was there. This is 8.6:1. */
	.ns-icon.star,
	.nav-stat.xp .ns-value {
		color: var(--gold);
	}






	/* Amber rather than the old --accent-deep: same problem, same fix. */
	.ns-icon.flame {
		color: var(--ember);
	}






	.ns-icon {
		font-size: 1.1rem;
	}






	.ns-value {
		font-size: 0.9rem;
		font-weight: 700;
		/* Bright green reads on the black ribbon in both themes; --leaf is
		   dark green in light mode and would only reach ~3:1 here. */
		color: var(--on-strip-accent);
	}






	.today-tier {
		margin-inline-start: 6px;
		opacity: 0.85;
		text-transform: capitalize;
	}






	@media (max-width: 520px) {
	}






	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}






	.action-row {
		grid-template-columns: repeat(2, 1fr);
	}






	.action-card {
		flex-direction: row !important;
		justify-content: flex-start !important;
		gap: 20px !important;
		padding: 16px 24px !important;
		text-align: left !important;
	}






	.stat-content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex: 1;
	}






	.action-card .stat-icon {
		font-size: 2rem;
	}






	.action-card .stat-cta {
		margin-top: 0;
		font-size: 0.85rem;
	}






	.stat-card {
		background: var(--paper-raised);
		border: 1.5px solid var(--leaf);
		border-radius: 14px;
		box-shadow: var(--paper-shadow);
		padding: 20px 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		text-align: center;
		transition:
			transform 0.25s ease,
			border-color 0.25s;
	}






	.stat-card:hover {
		transform: translateY(-3px);
		border-color: var(--accent);
	}






	.stat-icon {
		display: inline-flex;
	}






	.stat-icon.warm {
		color: var(--accent);
	}






	.stat-icon {
		font-size: 1.6rem;
	}






	.stat-value {
		font-family: var(--font-display);
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--ink);
		line-height: 1;
	}






	.stat-label {
		font-size: 0.78rem;
		color: var(--ink-soft);
		font-weight: 500;
	}






	/* The relocated cards carry a title instead of a big numeral, so the
	   label has to do the work the number does on the other two. */
	.stat-label.strong {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--ink);
		line-height: 1.25;
	}






	.stat-sub {
		font-size: 0.78rem;
		color: var(--ink-soft);
	}






	.stat-icon.aim {
		font-size: 1.5rem;
		line-height: 1;
	}






	/* ── Nav Cards ────────────────────────────────────── */
	.nav-cards {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 24px;
	}






	.nav-card {
		background: var(--paper-raised);
		border-radius: 18px;
		padding: 36px 32px;
		text-decoration: none;
		color: var(--ink);
		/* Green outline so the cards carry brand colour instead of reading
		   as plain white panels. */
		border: 1.5px solid var(--leaf);
		box-shadow: var(--paper-shadow);
		transition: all 0.3s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		position: relative;
		overflow: hidden;
	}






	.card-glow {
		position: absolute;
		inset: 0;
		opacity: 0;
		transition: opacity 0.3s;
		border-radius: inherit;
	}






	.nav-card.lessons .card-glow {
		background: radial-gradient(
			circle at 50% 0%,
			var(--accent-wash),
			transparent 70%
		);
	}






	.nav-card.basics .card-glow {
		background: radial-gradient(
			circle at 50% 0%,
			var(--leaf-wash),
			transparent 70%
		);
	}






	.nav-card:hover .card-glow {
		opacity: 1;
	}






	.nav-card:hover {
		transform: translateY(-6px);
	}






	.nav-card.lessons:hover {
		border-color: var(--accent);
	}






	.nav-card.basics:hover {
		border-color: var(--leaf);
	}






	.nav-card .icon {
		margin-bottom: 16px;
		z-index: 1;
	}






	.nav-card.lessons .icon {
		color: var(--accent);
	}






	.nav-card.basics .icon {
		color: var(--leaf);
	}






	.nav-card h2 {
		font-family: var(--font-display);
		font-size: 1.55rem;
		font-weight: 700;
		margin-bottom: 12px;
		position: relative;
		z-index: 1;
	}






	.nav-card p {
		color: var(--ink-soft);
		line-height: 1.6;
		font-size: 0.92rem;
		position: relative;
		z-index: 1;
	}






	.card-meta {
		margin-top: 14px;
		padding: 5px 14px;
		background: var(--accent-wash);
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--accent-deep);
		z-index: 1;
	}






	.card-meta.done {
		background: var(--leaf-wash);
		color: var(--leaf);
	}






	.card-meta.basics-meta {
		background: var(--leaf-wash);
		color: var(--leaf);
	}






	/* Clickable stat card for due reviews */
	.stat-card-link {
		text-decoration: none;
		cursor: pointer;
	}






	.stat-card-link.has-words {
		border-color: var(--line);
		background: var(--accent-wash);
	}






	.stat-card-link.has-words:hover {
		border-color: var(--accent);
		box-shadow: 0 8px 24px rgba(46, 204, 113, 0.15);
	}






	.stat-cta {
		font-size: 0.72rem;
		/* Sits on the tinted stat card, where --leaf measured 4.01:1. */
		color: var(--accent-deep);
		font-weight: 700;
		margin-top: 2px;
	}






	.stat-cta.vocab-cta {
		color: var(--accent-deep);
	}






	/* ── Card Progress Bar ── */
	.card-progress-bar {
		width: 100%;
		height: 5px;
		background: var(--paper-sunken);
		border-radius: 3px;
		margin-top: 10px;
		overflow: hidden;
	}






	.card-progress-fill {
		height: 100%;
		background: var(--leaf);
		border-radius: 3px;
		transition: width 0.5s ease;
	}






	.nav-card .arrow {
		margin-top: 18px;
		font-size: 1.5rem;
		opacity: 0;
		transform: translateX(-10px);
		transition: all 0.3s ease;
		position: relative;
		z-index: 1;
	}






	.nav-card:hover .arrow {
		opacity: 1;
		transform: translateX(0);
	}






	/* ── Toast ────────────────────────────────────────── */
	/* ── First Step (day-zero single door) ────────────── */
	.first-step {
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 18px;
		box-shadow: var(--paper-shadow);
		padding: 34px 28px;
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 12px;
	}






	.fs-countdown {
		background: var(--accent-wash);
		color: var(--accent-deep);
		border-radius: 999px;
		padding: 4px 14px;
		font-weight: 700;
		font-size: 0.88rem;
	}






	.fs-title {
		font-family: var(--font-display);
		font-size: 1.65rem;
		color: var(--ink);
		margin: 0;
	}






	.fs-sub {
		color: var(--ink-soft);
		line-height: 1.6;
		max-width: 460px;
		margin: 0;
	}






	.fs-primary {
		background: var(--accent);
		color: var(--on-accent);
		border-radius: 12px;
		padding: 15px 30px;
		font-size: 1.1rem;
		font-weight: 800;
		text-decoration: none;
		margin-top: 6px;
		transition: background 0.15s;
	}






	.fs-primary:hover {
		background: var(--accent-deep);
	}






	.fs-secondary {
		color: var(--ink-faint);
		font-size: 0.92rem;
		text-decoration: underline;
	}






	/* On a narrow phone the tag would squeeze the bar itself down to a stub.
	   Shrink the tag, not the bar — the bar is the thing being read. */
	@media (max-width: 440px) {

	}






	@media (max-width: 640px) {

	}






	.confirm-toast {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%) translateY(-120px);
		background: var(--leaf);
		color: var(--on-accent);
		padding: 16px 32px;
		border-radius: 14px;
		font-size: 1rem;
		font-weight: 600;
		box-shadow: 0 10px 30px rgba(88, 214, 141, 0.35);
		z-index: 2000;
		/* visibility keeps the hidden toast out of screen readers, innerText
		   and search snippets; the delay lets the slide-out finish first. */
		visibility: hidden;
		transition:
			transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275),
			visibility 0s 0.5s;
	}






	.confirm-toast.show {
		transform: translateX(-50%) translateY(0);
		visibility: visible;
		transition-delay: 0s, 0s;
	}






	/* ── Auth Modal ───────────────────────────────────── */
	.auth-overlay {
		display: flex;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		z-index: 1000;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}






	.auth-modal {
		background: var(--paper-raised);
		border-radius: 20px;
		padding: 40px;
		max-width: 400px;
		width: 100%;
		border: 1px solid var(--line);
		box-shadow: var(--paper-shadow);
		position: relative;
	}






	.auth-close {
		position: absolute;
		top: 15px;
		right: 20px;
		background: none;
		border: none;
		color: var(--ink-soft);
		font-size: 1.5rem;
		cursor: pointer;
	}






	.auth-modal h2 {
		margin-bottom: 20px;
		color: var(--ink);
		font-family: var(--font-display);
	}






	.auth-error {
		background: rgba(231, 76, 60, 0.08);
		color: #e74c3c;
		padding: 10px;
		border-radius: 10px;
		margin-bottom: 15px;
		font-size: 0.9rem;
	}






	.auth-field {
		margin-bottom: 15px;
	}






	.auth-field input {
		width: 100%;
		padding: 12px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: var(--paper-sunken);
		color: var(--ink);
		font-size: 1rem;
		box-sizing: border-box;
		font-family: inherit;
	}






	.auth-field input::placeholder {
		color: var(--ink-faint);
	}






	.auth-submit {
		width: 100%;
		padding: 12px;
		border-radius: 10px;
		border: none;
		background: var(--accent);
		color: var(--on-accent);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		margin-top: 5px;
		transition: opacity 0.2s;
		font-family: inherit;
	}






	.auth-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}






	.auth-forgot {
		text-align: center;
		margin: 12px 0 0;
		font-size: 0.86rem;
	}






	.auth-forgot a {
		color: var(--ink-faint);
		text-decoration: underline;
	}






	.auth-forgot a:hover {
		color: var(--accent);
	}






	.auth-toggle {
		text-align: center;
		margin-top: 15px;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}






	.auth-toggle a {
		color: var(--accent-deep);
		text-decoration: none;
		font-weight: 600;
	}






	/* ── Calendar flashcard overlay ───────────────────── */
	.cal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.82);
		backdrop-filter: blur(6px);
		z-index: 1000;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}






	.cal-modal {
		background: var(--paper-raised);
		border-radius: 24px;
		padding: 32px;
		max-width: 560px;
		width: 100%;
		border: 1px solid var(--line);
		position: relative;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
		max-height: 90vh;
		overflow-y: auto;
	}






	.cal-close {
		position: absolute;
		top: 16px;
		right: 20px;
		background: none;
		border: none;
		color: var(--ink-faint);
		font-size: 1.6rem;
		cursor: pointer;
		line-height: 1;
		padding: 4px 8px;
		transition: color 0.2s;
		font-family: inherit;
	}






	.cal-close:hover {
		color: var(--ink);
	}






	.cal-header {
		margin-bottom: 18px;
		padding-right: 36px;
	}






	.cal-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--ink);
		margin: 0 0 6px;
	}






	.cal-header p {
		font-size: 0.88rem;
		color: var(--ink-soft);
		margin: 0;
	}






	/* ── Practice Calendar (inside modal) ────────────── */
	.pcal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}






	.pcal-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--ink-soft);
	}






	.pcal-nav-btn {
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		color: var(--ink-soft);
		width: 30px;
		height: 30px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1.1rem;
		font-family: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		transition: all 0.2s;
	}






	.pcal-nav-btn:hover:not(:disabled) {
		background: var(--accent-wash);
		border-color: var(--accent);
		color: var(--ink);
	}






	.pcal-nav-btn:disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}






	.pcal-dow {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		margin-bottom: 4px;
	}






	.pcal-dow-cell {
		text-align: center;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--ink-faint);
		padding: 3px 0;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}






	.pcal-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		margin-bottom: 18px;
	}






	.pcal-cell {
		aspect-ratio: 1;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--ink-soft);
		background: var(--paper-sunken);
		border: 1px solid transparent;
		transition:
			background 0.15s,
			border-color 0.15s;
		cursor: default;
	}






	.pcal-empty {
		background: transparent !important;
		border-color: transparent !important;
	}






	.pcal-cell.practiced {
		background: var(--leaf-wash);
		border-color: var(--leaf);
		color: var(--leaf);
		font-weight: 700;
	}






	.pcal-cell.today {
		border-color: var(--accent);
		color: var(--accent-deep);
		font-weight: 700;
	}






	.pcal-cell.practiced.today {
		background: var(--leaf-wash);
		border-color: var(--leaf);
		color: var(--leaf);
		box-shadow: inset 0 0 0 1px var(--accent);
	}






	/* ── Mastery Section ──────────────────────────────── */
	.stats-overview {
		margin-bottom: 24px;
	}






	.mastery-section {
		background: var(--paper-sunken);
		border: 1px solid var(--line);
		border-radius: 20px;
		padding: 20px 24px;
	}






	.mastery-section h3 {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--ink-soft);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 16px;
	}






	.mastery-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}






	.mastery-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px;
		background: var(--paper-raised);
		border-radius: 12px;
		border: 1px solid var(--line);
		transition: transform 0.2s;
	}






	.mastery-item:hover {
		transform: translateY(-2px);
		background: var(--paper-raised);
	}






	.m-label {
		font-size: 0.75rem;
		font-weight: 800;
		padding: 2px 8px;
		border-radius: 6px;
		margin-bottom: 8px;
	}






	.mastery-item.a1 .m-label {
		background: rgba(49, 89, 122, 0.12);
		color: #5dade2;
	}





	.mastery-item.a2 .m-label {
		background: rgba(123, 75, 148, 0.12);
		color: #a569bd;
	}





	.mastery-item.b1 .m-label {
		background: var(--accent-wash);
		color: var(--accent-deep);
	}






	.m-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--ink);
		line-height: 1;
		margin-bottom: 4px;
	}






	.m-sub {
		font-size: 0.65rem;
		color: var(--ink-faint);
		text-transform: uppercase;
		font-weight: 600;
	}






	/* ── Legend ───────────────────────────────────────── */
	.cal-legend {
		display: flex;
		gap: 14px;
		align-items: center;
		flex-wrap: wrap;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}






	.leg-item {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}






	.leg-sw {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		flex-shrink: 0;
	}






	.practiced-sw {
		background: rgba(46, 204, 113, 0.25);
		border: 1px solid rgba(46, 204, 113, 0.5);
	}





	.today-sw {
		background: transparent;
		border: 1px solid var(--accent);
	}






	.pcal-month-stat {
		margin-left: auto;
		color: var(--leaf);
		font-weight: 700;
	}






	/* ── Responsive ───────────────────────────────────── */
	@media (max-width: 700px) {
		.home-container {
			padding: 20px 16px;
			gap: 20px;
		}

		.cal-modal {
			padding: 24px 18px;
		}

		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}

		.action-row {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.action-card {
			padding: 14px 20px !important;
			gap: 16px !important;
		}

		.action-card .stat-icon {
			font-size: 1.6rem;
		}

		.action-card .stat-value {
			font-size: 1.4rem;
		}

		.nav-cards {
			grid-template-columns: 1fr;
		}

		.brand-text {
			display: none;
		}

		.nav-stats {
			display: flex;
			margin-right: 0;
			background: transparent;
			border: none;
			padding: 0;
			gap: 2px;
		}

		.ns-value {
			font-size: 0.8rem;
		}

		.nav-text-btn {
			padding: 4px 10px;
			font-size: 0.75rem;
		}

		.mastery-grid {
			gap: 8px;
		}

		.mastery-item {
			padding: 8px;
		}

		.m-value {
			font-size: 1.2rem;
		}
	}</style>
