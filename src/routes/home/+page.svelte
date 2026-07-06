<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { preferencesStore } from "$stores/preferences";
	import type { Language } from "$stores/preferences";
	import * as auth from "$services/auth";
	import * as dataLayer from "$services/data-layer";
	import { getDueCount } from "$services/spaced-repetition";
	import { initSyncListeners } from "$services/sync-queue";
	import { getLessonIndex, type LessonMeta } from "$services/lesson-loader";
	import { computeStreak } from "$utils/streak";
	import Heatmap from "$lib/components/Heatmap.svelte";
	import TrophyCabinet from "$lib/components/TrophyCabinet.svelte";
	import InstallAppButton from "$lib/components/InstallAppButton.svelte";
	import Icon from "$lib/components/Icon.svelte";

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
	const todayTitle = $derived(
		lessonMetaIndex.find((m) => m.day === currentDay)?.title ?? "",
	);

	// Badges & Calendar expansion
	let showCalendar = $state(false);
	let showBadges = $state(false);
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
		currentDay = progress?.currentDay ?? 1;
		totalXp = progress?.xp ?? 0;

		// Actual lesson count from database
		const index = indexRes.status === "fulfilled" ? indexRes.value : [];
		totalLessons = index.length;
		lessonMetaIndex = index;

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

	async function onLanguageChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		language = select.value as Language;
		preferencesStore.update((s) => ({ ...s, language }));
		await dataLayer.setLanguage(language);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && showCalendar) showCalendar = false;
		if (e.key === "Escape" && showAuthModal) toggleAuthModal();
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

<svelte:window onkeydown={handleKeydown} />

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
				<h2>📅 Practice Calendar</h2>
				<p>
					{daysCompleted} lesson{daysCompleted === 1 ? "" : "s"} completed
					{#if streakCount > 0}
						· {streakCount}-day streak 🔥{/if}
				</p>
			</div>

			<!-- Month navigation -->
			<div class="pcal-header">
				<button
					class="pcal-nav-btn"
					onclick={prevCalMonth}
					aria-label="Previous month">‹</button
				>
				<span class="pcal-title">{MONTH_NAMES[calMonth]} {calYear}</span
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
				{#each ["M", "T", "W", "T", "F", "S", "S"] as label}
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
								? `Practiced on ${new Date(cell.key!).toLocaleDateString("en", { month: "long", day: "numeric" })}`
								: cell.isToday
									? "Today"
									: ""}>{cell.day}</span
						>
					{/if}
				{/each}
			</div>

			<!-- Legend -->
			<div class="cal-legend">
				<span class="leg-item"
					><span class="leg-sw practiced-sw"></span>Practiced</span
				>
				<span class="leg-item"
					><span class="leg-sw today-sw"></span>Today</span
				>
				<span class="leg-item pcal-month-stat">
					{thisMonthPracticed} day{thisMonthPracticed !== 1
						? "s"
						: ""} this month
				</span>
			</div>
		</div>
	</div>
{/if}

<div class="home-container">
	<!-- ── Top Nav ─────────────────────────────────────── -->
	<nav class="top-nav">
		<a href="/settings" class="nav-profile-brand" title="Profile Settings">
			<div class="brand-avatar">
				{#if avatarUrl}
					<img src={avatarUrl} alt="Avatar" />
				{:else}
					{(displayName || "L").charAt(0).toUpperCase()}
				{/if}
			</div>
			<span class="brand-text">{displayName}</span>
		</a>

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
					<button
						class="nav-stat streak"
						onclick={() => (showCalendar = true)}
						title="View Streak History"
					>
						<span class="ns-icon flame"><Icon name="flame" size={16} /></span>
						<span class="ns-value">{streakCount}</span>
					</button>
				</div>

				<a href="/settings" class="nav-icon-btn" title="Settings"
					><Icon name="gear" size={19} /></a
				>
				<button class="nav-text-btn" onclick={handleSignOut}
					>Sign Out</button
				>
			{:else}
				<button class="nav-text-btn" onclick={toggleAuthModal}
					>Sign In</button
				>
			{/if}
		</div>
	</nav>

	<!-- ── Welcome Banner ──────────────────────────────── -->
	<div class="welcome-banner">
		<div class="welcome-left">
			<div>
				{#if isAuthenticated}
					<div class="welcome-header-row">
						<div>
							<h1>
								Welcome back, {displayName.split(" ")[0]}! 👋
							</h1>
							<p>
								{streakCount > 0
									? `You're on a ${streakCount}-day streak — keep it going!`
									: "Pick up where you left off."}
							</p>
						</div>
					</div>
				{:else}
					<h1>Mirifer</h1>
					<p>Learn German the Natural Way</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- ── Today's Session (primary daily action) ──────── -->
	{#if isAuthenticated}
		<a href="/lesson" class="today-session" title="Start today's session">
			<div class="today-info">
				<span class="today-label">
					{language === "fa" ? "جلسه امروز" : "TODAY'S SESSION"}
				</span>
				{#if progressLoaded}
					<span class="today-title">
						{#if dueReviews > 0}
							{Math.min(dueReviews, 8)}
							{language === "fa" ? "مرور" : "reviews"} &nbsp;+&nbsp;
						{/if}
						{language === "fa" ? "روز" : "Day"}
						{todayTitle || currentDay}
					</span>
					<span class="today-sub">
						{language === "fa"
							? "حدود ۱۰ تا ۱۵ دقیقه"
							: "~10–15 minutes"}
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
	{#if isAuthenticated}
		<div class="stats-row action-row">
			<a
				href="/review"
				class="stat-card stat-card-link action-card"
				class:has-due={dueReviews > 0}
				title="Go to reviews"
			>
				<span class="stat-icon leafy"><Icon name="refresh" size={26} /></span>
				<div class="stat-content">
					<span class="stat-value">{dueReviews}</span>
					<span class="stat-label"
						>{dueReviews === 0
							? "All caught up!"
							: "Due Reviews"}</span
					>
				</div>
				{#if dueReviews > 0}
					<span class="stat-cta">Review now →</span>
				{/if}
			</a>
			<a
				href="/vocabulary"
				class="stat-card stat-card-link action-card"
				class:has-words={savedWordCount > 0}
				title="View saved vocabulary"
			>
				<span class="stat-icon warm"><Icon name="bookmark" size={26} /></span>
				<div class="stat-content">
					<span class="stat-value">{savedWordCount}</span>
					<span class="stat-label">Saved Words</span>
				</div>
				{#if savedWordCount > 0}
					<span class="stat-cta vocab-cta">Practice →</span>
				{/if}
			</a>
		</div>
	{/if}

	<!-- ── Nav Cards ───────────────────────────────────── -->
	<div class="nav-cards" id="categories-grid">
		<a href="/lesson" class="nav-card lessons">
			<div class="card-glow"></div>
			<div class="icon"><Icon name="book" size={44} /></div>
			<h2>{content.lessonsTitle}</h2>
			<p>{content.lessonsDesc}</p>
			{#if isAuthenticated}
				{#if totalLessons > 0 && daysCompleted >= totalLessons}
					<div class="card-meta done">
						🎉 All {totalLessons} days complete!
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
							{daysCompleted} of {totalLessons} days · {progressPercent}%
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
					<div class="card-meta">Start Day 1 →</div>
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
				12 topics · Pronouns, Articles &amp; more
			</div>
			<div class="arrow">→</div>
		</a>
	</div>

	<!-- ── Footer ──────────────────────────────────────── -->
	<footer class="home-footer">
		<p>Made with ❤️ for language learners</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}

	:global(body) {
		background: var(--paper);
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

	/* ── Top Nav ──────────────────────────────────────── */
	.top-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.nav-profile-brand {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.nav-profile-brand:hover {
		opacity: 0.8;
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
		color: #fff8f0;
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
		color: var(--ink);
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	/* Compact language picker */

	.nav-icon-btn {
		text-decoration: none;
		padding: 6px;
		border-radius: 8px;
		transition: all 0.2s;
		line-height: 1;
		color: var(--ink-soft);
		display: inline-flex;
	}

	.nav-icon-btn:hover {
		color: var(--ink);
		background: var(--paper-sunken);
	}

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

	/* ── Welcome Banner ───────────────────────────────── */
	.welcome-banner {
		background: var(--paper-raised);
		border: 1px solid var(--line);
		border-radius: 18px;
		box-shadow: var(--paper-shadow);
		padding: 28px 32px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}

	.welcome-banner p {
		color: var(--ink-soft);
	}

	.welcome-left {
		display: flex;
		align-items: center;
		gap: 20px;
		flex: 1;
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
		color: #fff8f0;
		box-shadow: 0 10px 30px rgba(156, 69, 20, 0.28);
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
		background: #fff8f0;
		color: var(--accent-deep);
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

	.welcome-header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		width: 100%;
		gap: 20px;
	}

	.nav-stats {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-right: 8px;
		background: var(--paper-sunken);
		padding: 4px;
		border-radius: 12px;
		border: 1px solid var(--line);
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
		color: var(--ink);
	}

	.nav-stat:hover {
		background: var(--paper-sunken);
	}

	.ns-icon {
		display: inline-flex;
	}

	.ns-icon.star {
		color: var(--accent);
	}

	.ns-icon.flame {
		color: var(--accent-deep);
	}

	.ns-icon {
		font-size: 1.1rem;
	}

	.ns-value {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.welcome-left h1 {
		font-family: var(--font-display);
		font-size: 1.7rem;
		font-weight: 700;
		margin: 0 0 6px;
		color: var(--ink);
	}

	.welcome-left p {
		margin: 0;
		color: #a0a0a0;
		font-size: 0.95rem;
	}

	/* ── Stats Row ────────────────────────────────────── */
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
		border: 1px solid var(--line);
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

	.stat-icon.leafy {
		color: var(--leaf);
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
		border: 1px solid var(--line);
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

	.stat-card-link.has-due {
		border-color: var(--leaf);
		background: var(--leaf-wash);
	}

	.stat-card-link.has-due:hover {
		border-color: var(--leaf);
		box-shadow: 0 8px 24px rgba(47, 111, 79, 0.18);
	}

	.stat-card-link.has-words {
		border-color: var(--line);
		background: var(--accent-wash);
	}

	.stat-card-link.has-words:hover {
		border-color: var(--accent);
		box-shadow: 0 8px 24px rgba(156, 69, 20, 0.15);
	}

	.stat-cta {
		font-size: 0.72rem;
		color: var(--leaf);
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

	/* ── Footer ───────────────────────────────────────── */
	.home-footer {
		text-align: center;
		padding-top: 20px;
		border-top: 1px solid var(--line);
		color: var(--ink-faint);
		font-size: 0.88rem;
		margin-top: auto;
	}

	/* ── Toast ────────────────────────────────────────── */
	.confirm-toast {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%) translateY(-120px);
		background: var(--leaf);
		color: #fff8f0;
		padding: 16px 32px;
		border-radius: 14px;
		font-size: 1rem;
		font-weight: 600;
		box-shadow: 0 10px 30px rgba(47, 111, 79, 0.35);
		z-index: 2000;
		transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.confirm-toast.show {
		transform: translateX(-50%) translateY(0);
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
		background: rgba(178, 60, 43, 0.08);
		color: #b23c2b;
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
		color: #fff8f0;
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
		box-shadow: 0 24px 60px rgba(60, 48, 30, 0.25);
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
		color: #31597a;
	}
	.mastery-item.a2 .m-label {
		background: rgba(123, 75, 148, 0.12);
		color: #7b4b94;
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

		.welcome-banner {
			flex-direction: column;
			align-items: stretch;
			gap: 18px;
			padding: 20px;
		}

		.welcome-header-row {
			flex-direction: column;
			gap: 12px;
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

		.welcome-left {
			gap: 14px;
		}

		.welcome-left h1 {
			font-size: 1.35rem;
		}

		.welcome-left p {
			font-size: 0.88rem;
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
	}
</style>
