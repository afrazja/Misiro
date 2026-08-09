<script lang="ts">
	import { onMount, tick } from "svelte";
	import { goto } from "$app/navigation";
	import { updateLanguagePreferences, getUser } from "$services/auth";
	import { preferencesStore } from "$stores/preferences";
	import type { TargetLanguage } from "$stores/preferences";
	import * as dataLayer from "$services/data-layer";

	// The flow steps
	let step = $state(1);
	let maxSteps = $state(6);

	// The collected data
	let targetLanguage = $state<TargetLanguage>("de");
	let interfaceLanguage = $state<"en" | "fa">("en");
	let reason = $state("");
	let examGoal = $state<"scheduled" | "planned" | "none">("none");
	let examDate = $state("");
	let showDatePicker = $state(false);
	let skillLevel = $state("");
	let dailyGoal = $state("");

	let isSaving = $state(false);
	let saveError = $state("");

	// Date bounds for the exam picker: tomorrow … +2 years
	const toISO = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	const minExamDate = toISO(new Date(Date.now() + 86400000));
	const maxExamDate = toISO(new Date(Date.now() + 2 * 365 * 86400000));

	// Animations
	let enterClass = $state("slide-in-right");

	function nextStep(
		val: any,
		field: "target" | "interface" | "reason" | "examGoal" | "skill" | "goal",
	) {
		if (field === "target") targetLanguage = val;
		if (field === "interface") interfaceLanguage = val;
		if (field === "reason") reason = val;
		if (field === "examGoal") examGoal = val;
		if (field === "skill") skillLevel = val;
		if (field === "goal") dailyGoal = val;

		if (step < maxSteps) {
			enterClass = "slide-in-right";
			step++;
		} else {
			finishOnboarding();
		}
	}

	function prevStep() {
		if (step > 1) {
			enterClass = "slide-in-left";
			showDatePicker = false;
			step--;
		}
	}

	async function finishOnboarding() {
		isSaving = true;
		saveError = "";

		try {
			// Update auth metadata
			const res = await updateLanguagePreferences(
				interfaceLanguage,
				targetLanguage,
			);
			if (res.error) throw new Error(res.error);

			// Update preferences store
			preferencesStore.update((s) => ({
				...s,
				language: interfaceLanguage,
				targetLanguage: targetLanguage,
			}));

			// Local Data Layer updates
			await dataLayer.setLanguage(interfaceLanguage);

			// Goethe exam plan — drives the countdown + readiness on /home
			await dataLayer.setExamSettings({
				goal: examGoal,
				examDate: examGoal === "scheduled" && examDate ? examDate : null,
			});

			// Optional: save the other onboarding data explicitly to the database
			// (If you want to create a column for it later, or store it in user_metadata)
			const user = await getUser();
			if (user) {
				const { getSupabaseBrowserClient } = await import(
					"$lib/supabase/client"
				);
				const sb = getSupabaseBrowserClient();
				if (sb) {
					await sb.auth.updateUser({
						data: {
							onboarding: {
								reason,
								skillLevel,
								dailyGoal,
							},
						},
					});
				}
			}

			// Force a hard sync then navigate to the dashboard
			await dataLayer.syncOnLogin();
			goto("/home");
		} catch (e: any) {
			saveError =
				e.message || "There was a problem saving your preferences.";
			isSaving = false;
		}
	}

	onMount(() => {
		// Preload home chunks so transition is smooth
		fetch("/home");
	});
</script>

<svelte:head>
	<title>Customize Your Path | Mirifer</title>
</svelte:head>

<div class="onboarding-bg">
	<div class="stars"></div>
	<div class="stars2"></div>
</div>

<div class="onboarding-layout">
	<!-- Progress Bar -->
	<div class="progress-bar">
		<div
			class="progress-fill"
			style="width: {(step / maxSteps) * 100}%"
		></div>
	</div>

	{#if step > 1 && !isSaving}
		<button class="back-btn" onclick={prevStep} aria-label="Go back"
			>← Back</button
		>
	{/if}

	<div class="wizard-container">
		{#if isSaving}
			<div class="wizard-step centered flex-col fade-in">
				<div class="spinner"></div>
				<h2 class="save-title">Personalizing your experience...</h2>
				<p class="save-subtitle">
					Preparing your daily lessons and review algorithms.
				</p>
				{#if saveError}
					<div class="error-box">
						{saveError}
						<button onclick={() => (isSaving = false)}>Retry</button
						>
					</div>
				{/if}
			</div>
		{:else if step === 1}
			<!-- STEP 1: TARGET LANGUAGE -->
			<div class="wizard-step {enterClass}">
				<h2 class="q-title">What do you want to learn?</h2>
				<p class="q-sub">Select the language you want to master.</p>

				<div class="options-grid cols-2">
					<button
						class="choice-card"
						onclick={() => nextStep("de", "target")}
					>
						<span class="flag">🇩🇪</span>
						<span class="lbl">German</span>
					</button>
					<button
						class="choice-card"
						onclick={() => nextStep("fr", "target")}
					>
						<span class="flag">🇫🇷</span>
						<span class="lbl">French</span>
					</button>
				</div>
				<p class="helper-text">
					You can easily change this later in Settings.
				</p>
			</div>
		{:else if step === 2}
			<!-- STEP 2: INTERFACE LANGUAGE -->
			<div class="wizard-step {enterClass}">
				<h2 class="q-title">
					Which language should we use for explanations?
				</h2>
				<p class="q-sub">
					This is the language of instructions, hints, and grammar
					rules.
				</p>

				<div class="options-grid cols-2">
					<button
						class="choice-card"
						onclick={() => nextStep("en", "interface")}
					>
						<span class="flag">🇬🇧</span>
						<span class="lbl">English</span>
					</button>
					<button
						class="choice-card"
						onclick={() => nextStep("fa", "interface")}
					>
						<span class="flag">🇮🇷</span>
						<span class="lbl">Persian (فارسی)</span>
					</button>
				</div>
			</div>
		{:else if step === 3}
			<!-- STEP 3: WHY ARE YOU LEARNING -->
			<div class="wizard-step {enterClass}">
				<h2 class="q-title">
					Why are you learning {targetLanguage === "de"
						? "German"
						: "French"}?
				</h2>
				<p class="q-sub">
					This helps us understand your goals and keep you motivated.
				</p>

				<div class="options-grid cols-2">
					<button
						class="choice-card small-lbl"
						onclick={() => nextStep("moving", "reason")}
					>
						<span class="emoji">✈️</span>
						<span>Relocation / Moving</span>
					</button>
					<button
						class="choice-card small-lbl"
						onclick={() => nextStep("work", "reason")}
					>
						<span class="emoji">💼</span>
						<span>Career / Work</span>
					</button>
					<button
						class="choice-card small-lbl"
						onclick={() => nextStep("study", "reason")}
					>
						<span class="emoji">🎓</span>
						<span>University / Study</span>
					</button>
					<button
						class="choice-card small-lbl"
						onclick={() => nextStep("travel", "reason")}
					>
						<span class="emoji">🌍</span>
						<span>Travel & Leisure</span>
					</button>
					<button
						class="choice-card small-lbl"
						onclick={() => nextStep("brain", "reason")}
					>
						<span class="emoji">🧠</span>
						<span>Brain Training</span>
					</button>
					<button
						class="choice-card small-lbl"
						onclick={() => nextStep("other", "reason")}
					>
						<span class="emoji">💬</span>
						<span>Connections</span>
					</button>
				</div>
			</div>
		{:else if step === 4}
			<!-- STEP 4: GOETHE A1 EXAM -->
			<div class="wizard-step {enterClass}">
				<h2 class="q-title">
					Are you preparing for the Goethe A1 exam?
				</h2>
				<p class="q-sub">
					If you have a date, your daily plan counts down to it — and
					shows exactly how ready you are.
				</p>

				{#if !showDatePicker}
					<div class="options-grid cols-1">
						<button
							class="choice-card flex-row"
							onclick={() => (showDatePicker = true)}
						>
							<span class="emoji">📅</span>
							<div class="lbl-block">
								<strong>Yes — my exam is booked</strong>
								<span>Goethe-Zertifikat A1 (Start Deutsch 1)</span>
							</div>
						</button>
						<button
							class="choice-card flex-row"
							onclick={() => nextStep("planned", "examGoal")}
						>
							<span class="emoji">🎯</span>
							<div class="lbl-block">
								<strong>Planning to take it</strong>
								<span>No date booked yet.</span>
							</div>
						</button>
						<button
							class="choice-card flex-row"
							onclick={() => nextStep("none", "examGoal")}
						>
							<span class="emoji">🌱</span>
							<div class="lbl-block">
								<strong>Not for an exam</strong>
								<span>I'm learning German for daily life.</span>
							</div>
						</button>
					</div>
				{:else}
					<div class="date-block">
						<label class="date-label" for="exam-date"
							>When is your exam?</label
						>
						<input
							id="exam-date"
							class="date-input"
							type="date"
							bind:value={examDate}
							min={minExamDate}
							max={maxExamDate}
						/>
						<button
							class="date-continue"
							disabled={!examDate}
							onclick={() => nextStep("scheduled", "examGoal")}
							>Continue →</button
						>
						<button
							class="date-skip"
							onclick={() => nextStep("planned", "examGoal")}
							>I don't have a date yet</button
						>
					</div>
				{/if}
			</div>
		{:else if step === 5}
			<!-- STEP 5: CURRENT LEVEL -->
			<div class="wizard-step {enterClass}">
				<h2 class="q-title">
					How much {targetLanguage === "de" ? "German" : "French"} do you
					already know?
				</h2>
				<p class="q-sub">Don't worry, everyone starts somewhere.</p>

				<div class="options-grid cols-1">
					<button
						class="choice-card flex-row"
						onclick={() => nextStep("beginner", "skill")}
					>
						<span class="emoji">🐣</span>
						<div class="lbl-block">
							<strong>I'm a complete beginner</strong>
							<span>I know absolutely nothing.</span>
						</div>
					</button>
					<button
						class="choice-card flex-row"
						onclick={() => nextStep("some_words", "skill")}
					>
						<span class="emoji">🐥</span>
						<div class="lbl-block">
							<strong>I know a few words</strong>
							<span>Greetings, numbers, simple phrases.</span>
						</div>
					</button>
					<button
						class="choice-card flex-row"
						onclick={() => nextStep("basic", "skill")}
					>
						<span class="emoji">🦅</span>
						<div class="lbl-block">
							<strong>I can have basic conversations</strong>
							<span
								>But I want to build fluency and confidence.</span
							>
						</div>
					</button>
				</div>
			</div>
		{:else if step === 6}
			<!-- STEP 6: DAILY GOAL -->
			<div class="wizard-step {enterClass}">
				<h2 class="q-title">What's your daily goal?</h2>
				<p class="q-sub">
					Consistency beats intensity when learning a language.
				</p>

				<div class="options-grid cols-1">
					<button
						class="choice-card flex-row"
						onclick={() => nextStep("5m", "goal")}
					>
						<span class="emoji">☕</span>
						<div class="lbl-block">
							<strong>5 minutes a day</strong>
							<span>Casual &middot; Good for busy days.</span>
						</div>
					</button>
					<button
						class="choice-card flex-row"
						onclick={() => nextStep("15m", "goal")}
					>
						<span class="emoji">🏃</span>
						<div class="lbl-block">
							<strong>15 minutes a day</strong>
							<span
								>Regular &middot; Steady progress. (Recommended)</span
							>
						</div>
					</button>
					<button
						class="choice-card flex-row"
						onclick={() => nextStep("30m", "goal")}
					>
						<span class="emoji">🚀</span>
						<div class="lbl-block">
							<strong>30+ minutes a day</strong>
							<span>Serious &middot; Rapid advancement.</span>
						</div>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: var(--paper);
	}

	.onboarding-bg {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		background: var(--paper);
		z-index: 1;
		pointer-events: none;
	}

	.onboarding-layout {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		padding: 24px;
		max-width: 800px;
		margin: 0 auto;
	}

	/* Progress Bar */
	.progress-bar {
		width: 100%;
		height: 6px;
		background: var(--paper-sunken);
		border-radius: 6px;
		overflow: hidden;
		margin-bottom: 30px;
	}
	.progress-fill {
		height: 100%;
		background: var(--leaf);
		border-radius: 6px;
		transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--ink-soft);
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		align-self: flex-start;
		padding: 8px 0;
		margin-bottom: 20px;
		transition: color 0.2s;
	}
	.back-btn:hover {
		color: var(--ink);
	}

	.wizard-container {
		flex: 1;
		display: flex;
		align-items: center;
		padding-bottom: 10vh;
	}

	.wizard-step {
		width: 100%;
	}

	.q-title {
		font-size: clamp(2rem, 5vw, 2.6rem);
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--ink);
		line-height: 1.15;
		margin: 0 0 12px 0;
		letter-spacing: -0.02em;
	}

	.q-sub {
		font-size: 1.1rem;
		color: var(--ink-soft);
		margin-bottom: 40px;
	}

	.helper-text {
		font-size: 0.9rem;
		color: var(--ink-faint);
		margin-top: 24px;
		text-align: center;
	}

	/* CSS Animations */
	@keyframes slideInRight {
		from {
			opacity: 0;
			transform: translateX(30px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	@keyframes slideInLeft {
		from {
			opacity: 0;
			transform: translateX(-30px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.slide-in-right {
		animation: slideInRight 0.4s forwards cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.slide-in-left {
		animation: slideInLeft 0.4s forwards cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.fade-in {
		animation: fadeIn 0.4s forwards;
	}

	/* Options Grid */
	.options-grid {
		display: grid;
		gap: 16px;
	}
	.cols-2 {
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}
	.cols-1 {
		grid-template-columns: 1fr;
		max-width: 600px;
	}

	.choice-card {
		background: var(--paper-raised);
		border: 2px solid var(--line);
		border-radius: 16px;
		padding: 24px;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.choice-card:hover {
		background: var(--accent-wash);
		border-color: var(--accent);
		transform: translateY(-2px);
	}
	.choice-card:active {
		transform: scale(0.98);
	}

	.choice-card.flex-row {
		flex-direction: row;
		padding: 20px 24px;
		text-align: left;
		align-items: center;
		justify-content: flex-start;
		gap: 20px;
	}

	.flag,
	.emoji {
		font-size: 3rem;
		margin-bottom: 12px;
	}
	.choice-card.flex-row .emoji {
		margin-bottom: 0;
		font-size: 2.5rem;
	}

	.lbl {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--ink);
	}
	.small-lbl {
		padding: 20px;
	}
	.small-lbl .emoji {
		font-size: 2.4rem;
		margin-bottom: 10px;
	}
	.small-lbl span {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--ink);
	}

	.lbl-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.lbl-block strong {
		font-size: 1.15rem;
		color: var(--ink);
	}
	.lbl-block span {
		font-size: 0.95rem;
		color: var(--ink-soft);
	}

	/* Exam date picker */
	.date-block {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 420px;
	}

	.date-label {
		font-weight: 600;
		color: var(--ink);
		font-size: 1.05rem;
	}

	.date-input {
		background: var(--paper-raised);
		border: 2px solid var(--line);
		border-radius: 12px;
		padding: 14px 16px;
		font-size: 1.1rem;
		font-family: var(--font-body);
		color: var(--ink);
	}

	.date-input:focus {
		border-color: var(--accent);
		outline: none;
	}

	.date-continue {
		background: var(--accent);
		color: #fff8f0;
		border: none;
		border-radius: 12px;
		padding: 14px 20px;
		font-size: 1.05rem;
		font-weight: 700;
		cursor: pointer;
	}

	.date-continue:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.date-skip {
		background: none;
		border: none;
		color: var(--ink-faint);
		text-decoration: underline;
		cursor: pointer;
		font-size: 0.95rem;
		padding: 4px;
	}

	/* Save state */
	.centered {
		text-align: center;
		align-items: center;
		justify-content: center;
	}
	.flex-col {
		display: flex;
		flex-direction: column;
	}
	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--line);
		border-left-color: var(--accent);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 24px;
	}
	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}

	.save-title {
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--ink);
		margin-bottom: 8px;
	}
	.save-subtitle {
		color: var(--ink-soft);
		font-size: 1.1rem;
	}
</style>
