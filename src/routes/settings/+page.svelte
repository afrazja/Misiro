<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import {
		isAuthenticated,
		getUser,
		getDisplayName,
		updateDisplayName,
		updatePassword,
		uploadAvatar,
		removeAvatar,
		getAvatarUrl,
		signOut,
	} from "$services/auth";
	import {
		getLanguage,
		setLanguage,
		getVoiceSpeed,
		setVoiceSpeed,
		getExamSettings,
		setExamSettings,
		setAvatarUrl as setLocalAvatarUrl,
		setDisplayName as setLocalDisplayName,
	} from "$services/data-layer";
	import {
		getTargetLanguage,
		updateLanguagePreferences,
	} from "$services/auth";
	import type { TargetLanguage } from "$lib/stores/preferences";

	// ============ STATE ============
	let isLoading = $state(true);
	let email = $state("");
	let displayName = $state("");
	let avatarUrl: string | null = $state(null);
	let currentLang = $state("en");
	let currentTargetLang = $state<TargetLanguage>("de");
	let voiceSpeed = $state(1.0);
	let langStatus = $state<{ text: string; type: "success" | "error" } | null>(
		null,
	);

	// Goethe exam plan
	let examGoal = $state<"scheduled" | "planned" | "none">("none");
	let examDate = $state("");
	let targetDate = $state("");
	let examStatus = $state<{ text: string; type: "success" | "error" } | null>(
		null,
	);
	const toISO = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	const minExamDate = toISO(new Date(Date.now() + 86400000));
	const maxExamDate = toISO(new Date(Date.now() + 2 * 365 * 86400000));

	// Password fields
	let newPassword = $state("");
	let confirmPassword = $state("");

	// Status messages
	let avatarStatus = $state<{
		text: string;
		type: "success" | "error";
	} | null>(null);
	let nameStatus = $state<{ text: string; type: "success" | "error" } | null>(
		null,
	);
	let passwordStatus = $state<{
		text: string;
		type: "success" | "error";
	} | null>(null);

	// File input ref
	let fileInput: HTMLInputElement | undefined = $state(undefined);

	// ============ COMPUTED ============
	const avatarInitial = $derived(
		(displayName || "L").charAt(0).toUpperCase(),
	);

	// ============ STATUS HELPERS ============
	function showStatus(
		setter: (
			val: { text: string; type: "success" | "error" } | null,
		) => void,
		text: string,
		type: "success" | "error",
		autoHide = true,
	) {
		setter({ text, type });
		if (autoHide && type === "success") {
			setTimeout(() => setter(null), 3000);
		}
	}

	// ============ AVATAR ============
	async function handleAvatarUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			showStatus(
				(v) => (avatarStatus = v),
				"Image must be less than 5MB.",
				"error",
				false,
			);
			return;
		}

		showStatus((v) => (avatarStatus = v), "Uploading...", "success", false);

		const result = await uploadAvatar(file);
		if (result.error) {
			showStatus((v) => (avatarStatus = v), result.error, "error", false);
		} else if (result.url) {
			setLocalAvatarUrl(result.url);
			avatarUrl = result.url;
			if (result.warning) {
				showStatus(
					(v) => (avatarStatus = v),
					"Photo set! Note: " + result.warning,
					"success",
					false,
				);
			} else {
				showStatus(
					(v) => (avatarStatus = v),
					"Photo updated!",
					"success",
				);
			}
		}

		// Reset file input
		target.value = "";
	}

	async function handleRemoveAvatar() {
		showStatus((v) => (avatarStatus = v), "Removing...", "success", false);

		const { error } = await removeAvatar();
		if (error) {
			showStatus((v) => (avatarStatus = v), error, "error", false);
		} else {
			setLocalAvatarUrl(null);
			avatarUrl = null;
			showStatus((v) => (avatarStatus = v), "Photo removed.", "success");
		}
	}

	// ============ DISPLAY NAME ============
	async function handleSaveName() {
		const trimmed = displayName.trim();
		if (!trimmed) {
			showStatus(
				(v) => (nameStatus = v),
				"Name cannot be empty.",
				"error",
				false,
			);
			return;
		}

		const { error } = await updateDisplayName(trimmed);
		if (error) {
			showStatus((v) => (nameStatus = v), error, "error", false);
		} else {
			setLocalDisplayName(trimmed);
			showStatus((v) => (nameStatus = v), "Name saved!", "success");
		}
	}

	// ============ PASSWORD ============
	async function handleChangePassword() {
		if (!newPassword || !confirmPassword) {
			showStatus(
				(v) => (passwordStatus = v),
				"Please fill in both fields.",
				"error",
				false,
			);
			return;
		}
		if (newPassword.length < 6) {
			showStatus(
				(v) => (passwordStatus = v),
				"Password must be at least 6 characters.",
				"error",
				false,
			);
			return;
		}
		if (newPassword !== confirmPassword) {
			showStatus(
				(v) => (passwordStatus = v),
				"Passwords do not match.",
				"error",
				false,
			);
			return;
		}

		const { error } = await updatePassword(newPassword);
		if (error) {
			showStatus((v) => (passwordStatus = v), error, "error", false);
		} else {
			showStatus(
				(v) => (passwordStatus = v),
				"Password updated!",
				"success",
			);
			newPassword = "";
			confirmPassword = "";
		}
	}

	// ============ PREFERENCES ============
	async function handleLanguageSave() {
		const { error: err } = await updateLanguagePreferences(
			currentLang as "en" | "fa",
			currentTargetLang,
		);
		if (err) {
			showStatus((v) => (langStatus = v), err, "error", false);
		} else {
			showStatus(
				(v) => (langStatus = v),
				"Language preferences saved!",
				"success",
			);
		}
	}

	function handleSpeedChange(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		voiceSpeed = val;
		setVoiceSpeed(val);
	}

	// ============ GOETHE EXAM PLAN ============
	async function handleExamSave() {
		if (examGoal === "scheduled" && !examDate) {
			showStatus(
				(v) => (examStatus = v),
				"Pick your exam date (or choose another option).",
				"error",
				false,
			);
			return;
		}
		await setExamSettings({
			goal: examGoal,
			examDate: examGoal === "scheduled" ? examDate : null,
			targetDate: examGoal === "planned" && targetDate ? targetDate : null,
		});
		showStatus((v) => (examStatus = v), "Exam plan saved!", "success");
	}

	// ============ SIGN OUT ============
	async function handleSignOut() {
		await signOut();
		window.location.href = "/";
	}

	// ============ LIFECYCLE ============
	onMount(async () => {
		const authed = await isAuthenticated();
		if (!authed) {
			goto("/");
			return;
		}

		// Load user info
		const user = await getUser();
		if (user) {
			email = user.email || "";
		}

		// Load display name
		const name = await getDisplayName();
		displayName = name;

		// Load avatar
		const avatar = await getAvatarUrl();
		if (avatar) {
			avatarUrl = avatar;
			setLocalAvatarUrl(avatar);
		}

		// Load preferences
		const savedLang = await getLanguage();
		if (savedLang) currentLang = savedLang;

		const savedTargetLang = await getTargetLanguage();
		if (savedTargetLang === "de" || savedTargetLang === "fr")
			currentTargetLang = savedTargetLang;

		const savedSpeed = await getVoiceSpeed();
		if (savedSpeed !== null && !isNaN(savedSpeed)) voiceSpeed = savedSpeed;

		const savedExam = await getExamSettings();
		if (savedExam) {
			examGoal = savedExam.goal;
			examDate = savedExam.examDate ?? "";
			targetDate = savedExam.targetDate ?? "";
		}

		isLoading = false;
	});
</script>

<svelte:head>
	<title>Settings - Mirifer</title>
</svelte:head>

{#if !isLoading}
	<div class="settings-container">
		<a href="/home" class="back-link">&larr; Back to Home</a>
		<h1 class="settings-title">Settings</h1>

		<!-- Profile Section -->
		<div class="settings-section">
			<h3><span class="section-icon">👤</span> Profile</h3>

			<div class="avatar-section">
				<div class="avatar-display">
					{#if avatarUrl}
						<img src={avatarUrl} alt="Avatar" />
					{:else}
						{avatarInitial}
					{/if}
				</div>
				<div class="avatar-actions">
					<button
						class="btn-secondary"
						onclick={() => fileInput?.click()}>Upload Photo</button
					>
					<input
						type="file"
						accept="image/*"
						bind:this={fileInput}
						onchange={handleAvatarUpload}
						style="display:none;"
					/>
					{#if avatarUrl}
						<button
							class="btn-secondary"
							onclick={handleRemoveAvatar}>Remove Photo</button
						>
					{/if}
				</div>
			</div>
			{#if avatarStatus}
				<div class="status-msg {avatarStatus.type}">
					{avatarStatus.text}
				</div>
			{/if}

			<div class="form-group">
				<label for="display-name">Display Name</label>
				<input
					type="text"
					id="display-name"
					placeholder="Your name"
					maxlength={40}
					bind:value={displayName}
				/>
			</div>
			<button class="btn-primary" onclick={handleSaveName}
				>Save Name</button
			>
			{#if nameStatus}
				<div class="status-msg {nameStatus.type}">
					{nameStatus.text}
				</div>
			{/if}
		</div>

		<!-- Security Section -->
		<div class="settings-section">
			<h3><span class="section-icon">🔒</span> Security</h3>

			<div class="form-group">
				<label for="new-password">New Password</label>
				<input
					type="password"
					id="new-password"
					placeholder="Min. 6 characters"
					minlength={6}
					bind:value={newPassword}
				/>
			</div>
			<div class="form-group">
				<label for="confirm-password">Confirm New Password</label>
				<input
					type="password"
					id="confirm-password"
					placeholder="Repeat password"
					minlength={6}
					bind:value={confirmPassword}
				/>
			</div>
			<button class="btn-primary" onclick={handleChangePassword}
				>Update Password</button
			>
			{#if passwordStatus}
				<div class="status-msg {passwordStatus.type}">
					{passwordStatus.text}
				</div>
			{/if}
		</div>

		<!-- Preferences Section -->
		<div class="settings-section">
			<h3><span class="section-icon">⚙</span> Preferences</h3>

			<div class="pref-row">
				<label for="pref-language">Interface Language</label>
				<select id="pref-language" bind:value={currentLang}>
					<option value="fa">فارسی</option>
					<option value="en">English</option>
				</select>
			</div>

			<div class="pref-row">
				<label for="pref-target">Learning Language</label>
				<div class="target-lang-select">
					<button
						class="target-btn {currentTargetLang === 'de'
							? 'active'
							: ''}"
						onclick={() => (currentTargetLang = "de")}
						type="button">🇩🇪 German</button
					>
					<button
						class="target-btn disabled"
						title="Coming soon"
						disabled
						type="button"
						>🇫🇷 French <span class="soon-badge">Soon</span></button
					>
				</div>
			</div>

			<div class="pref-row">
				<label for="pref-speed">Voice Speed (German audio)</label>
				<div class="speed-control">
					<input
						type="range"
						id="pref-speed"
						min="0.5"
						max="2.0"
						step="0.1"
						value={voiceSpeed}
						oninput={handleSpeedChange}
					/>
					<span class="speed-value">{voiceSpeed.toFixed(1)}x</span>
				</div>
			</div>

			<button
				class="btn-primary"
				onclick={handleLanguageSave}
				style="margin-top:8px;">Save Language Preferences</button
			>
			{#if langStatus}
				<div class="status-msg {langStatus.type}">
					{langStatus.text}
				</div>
			{/if}
		</div>

		<!-- Goethe Exam Section -->
		<div class="settings-section">
			<h3><span class="section-icon">🎓</span> Goethe A1 Exam</h3>

			<div class="pref-row">
				<label for="exam-goal">Your plan</label>
				<div class="target-lang-select" id="exam-goal">
					<button
						class="target-btn {examGoal === 'scheduled' ? 'active' : ''}"
						onclick={() => (examGoal = "scheduled")}
						type="button">📅 Booked</button
					>
					<button
						class="target-btn {examGoal === 'planned' ? 'active' : ''}"
						onclick={() => (examGoal = "planned")}
						type="button">🎯 Planning</button
					>
					<button
						class="target-btn {examGoal === 'none' ? 'active' : ''}"
						onclick={() => (examGoal = "none")}
						type="button">🌱 No exam</button
					>
				</div>
			</div>

			{#if examGoal === "scheduled"}
				<div class="pref-row">
					<label for="exam-date-input">Exam date</label>
					<input
						id="exam-date-input"
						class="exam-date-input"
						type="date"
						bind:value={examDate}
						min={minExamDate}
						max={maxExamDate}
					/>
				</div>
			{:else if examGoal === "planned"}
				<div class="pref-row">
					<label for="target-date-input">Ready-by target (optional)</label>
					<input
						id="target-date-input"
						class="exam-date-input"
						type="date"
						bind:value={targetDate}
						min={minExamDate}
						max={maxExamDate}
					/>
				</div>
			{/if}

			<button
				class="btn-primary"
				onclick={handleExamSave}
				style="margin-top:8px;">Save Exam Plan</button
			>
			{#if examStatus}
				<div class="status-msg {examStatus.type}">
					{examStatus.text}
				</div>
			{/if}
		</div>

		<!-- Account Section -->
		<div class="settings-section">
			<h3><span class="section-icon">📧</span> Account</h3>

			<div class="form-group">
				<span class="fake-label">Email</span>
				<div class="account-email">{email || "Loading..."}</div>
			</div>

			<button class="btn-danger" onclick={handleSignOut}>Sign Out</button>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background: var(--paper);
	}

	.settings-container {
		max-width: 600px;
		margin: 0 auto;
		padding: 40px 20px;
		min-height: 100vh;
		font-family: var(--font-body);
		color: var(--ink);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--ink-soft);
		text-decoration: none;
		font-size: 1rem;
		margin-bottom: 30px;
		transition: color 0.3s ease;
	}

	.back-link:hover {
		color: var(--accent-deep);
	}

	.settings-title {
		font-family: var(--font-display);
		font-size: 2rem;
		color: var(--ink);
		margin-bottom: 30px;
	}

	.settings-section {
		background: var(--paper-raised);
		border-radius: 18px;
		box-shadow: var(--paper-shadow);
		padding: 30px;
		margin-bottom: 20px;
		border: 1px solid var(--line);
	}

	.settings-section h3 {
		font-family: var(--font-display);
		font-size: 1.2rem;
		margin-bottom: 20px;
		color: var(--accent-deep);
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.section-icon {
		font-size: 1.3rem;
	}

	.form-group {
		margin-bottom: 15px;
	}

	.form-group label,
	.form-group .fake-label {
		display: block;
		font-size: 0.9rem;
		color: var(--ink-soft);
		margin-bottom: 6px;
	}

	.form-group input[type="text"],
	.form-group input[type="password"] {
		width: 100%;
		padding: 12px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: var(--paper-sunken);
		color: var(--ink);
		font-size: 1rem;
		transition: border-color 0.3s ease;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.btn-primary {
		padding: 10px 24px;
		border-radius: 10px;
		border: none;
		background: var(--accent);
		color: #fff8f0;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 18px rgba(156, 69, 20, 0.3);
	}

	.btn-secondary {
		padding: 10px 24px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-secondary:hover {
		border-color: var(--accent);
		background: var(--accent-wash);
	}

	.btn-danger {
		padding: 10px 24px;
		border-radius: 10px;
		border: 1px solid rgba(178, 60, 43, 0.4);
		background: rgba(178, 60, 43, 0.07);
		color: #b23c2b;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-danger:hover {
		background: rgba(178, 60, 43, 0.16);
		border-color: #b23c2b;
	}

	.avatar-section {
		display: flex;
		align-items: center;
		gap: 25px;
		margin-bottom: 20px;
	}

	.avatar-display {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		background: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		font-weight: 700;
		color: #fff8f0;
		border: 4px solid var(--line);
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar-display img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.status-msg {
		padding: 10px 15px;
		border-radius: 10px;
		font-size: 0.9rem;
		margin-top: 10px;
	}

	.status-msg.success {
		background: var(--leaf-wash);
		color: var(--leaf);
		border: 1px solid var(--leaf);
	}

	.status-msg.error {
		background: rgba(178, 60, 43, 0.08);
		color: #b23c2b;
		border: 1px solid rgba(178, 60, 43, 0.35);
	}

	.pref-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 0;
		border-bottom: 1px solid var(--line);
	}

	.pref-row:last-child {
		border-bottom: none;
	}

	.pref-row label {
		font-size: 1rem;
		color: var(--ink);
	}

	.pref-row select {
		padding: 8px 16px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: var(--paper-sunken);
		color: var(--ink);
		font-size: 0.95rem;
		cursor: pointer;
	}

	.pref-row select option {
		background: var(--paper-raised);
		color: var(--ink);
	}

	.speed-control {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.speed-control input[type="range"] {
		width: 120px;
		accent-color: var(--accent);
	}

	.speed-value {
		font-size: 0.9rem;
		color: var(--accent-deep);
		font-weight: 600;
		min-width: 40px;
		text-align: center;
	}

	.target-lang-select {
		display: flex;
		gap: 8px;
	}

	.exam-date-input {
		background: var(--paper-raised);
		border: 1.5px solid var(--line);
		border-radius: 10px;
		padding: 9px 12px;
		font-size: 0.95rem;
		font-family: var(--font-body);
		color: var(--ink);
	}

	.exam-date-input:focus {
		border-color: var(--accent);
		outline: none;
	}

	.target-btn {
		padding: 7px 14px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: var(--paper-sunken);
		color: var(--ink);
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.target-btn.active {
		border-color: var(--accent);
		background: var(--accent-wash);
	}

	.target-btn.disabled,
	.target-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.soon-badge {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		background: var(--accent-wash);
		border: 1px solid var(--accent);
		color: var(--accent-deep);
		border-radius: 4px;
		padding: 1px 5px;
	}

	.account-email {
		font-size: 1rem;
		color: var(--ink-soft);
		padding: 12px;
		background: var(--paper-sunken);
		border-radius: 10px;
		margin-bottom: 15px;
		word-break: break-all;
	}

	@media (max-width: 600px) {
		.settings-title {
			font-size: 1.5rem;
		}

		.avatar-section {
			flex-direction: column;
			text-align: center;
		}

		.settings-section {
			padding: 20px;
		}
	}
</style>
