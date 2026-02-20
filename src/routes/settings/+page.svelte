<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		isAuthenticated,
		getUser,
		getDisplayName,
		updateDisplayName,
		updatePassword,
		uploadAvatar,
		removeAvatar,
		getAvatarUrl,
		signOut
	} from '$services/auth';
	import {
		getLanguage,
		setLanguage,
		getVoiceSpeed,
		setVoiceSpeed,
		setAvatarUrl as setLocalAvatarUrl,
		setDisplayName as setLocalDisplayName
	} from '$services/data-layer';

	// ============ STATE ============
	let isLoading = $state(true);
	let email = $state('');
	let displayName = $state('');
	let avatarUrl: string | null = $state(null);
	let currentLang = $state('en');
	let voiceSpeed = $state(1.0);

	// Password fields
	let newPassword = $state('');
	let confirmPassword = $state('');

	// Status messages
	let avatarStatus = $state<{ text: string; type: 'success' | 'error' } | null>(null);
	let nameStatus = $state<{ text: string; type: 'success' | 'error' } | null>(null);
	let passwordStatus = $state<{ text: string; type: 'success' | 'error' } | null>(null);

	// File input ref
	let fileInput: HTMLInputElement | undefined = $state(undefined);

	// ============ COMPUTED ============
	const avatarInitial = $derived(
		(displayName || 'L').charAt(0).toUpperCase()
	);

	// ============ STATUS HELPERS ============
	function showStatus(
		setter: (val: { text: string; type: 'success' | 'error' } | null) => void,
		text: string,
		type: 'success' | 'error',
		autoHide = true
	) {
		setter({ text, type });
		if (autoHide && type === 'success') {
			setTimeout(() => setter(null), 3000);
		}
	}

	// ============ AVATAR ============
	async function handleAvatarUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			showStatus((v) => (avatarStatus = v), 'Image must be less than 5MB.', 'error', false);
			return;
		}

		showStatus((v) => (avatarStatus = v), 'Uploading...', 'success', false);

		const result = await uploadAvatar(file);
		if (result.error) {
			showStatus((v) => (avatarStatus = v), result.error, 'error', false);
		} else if (result.url) {
			setLocalAvatarUrl(result.url);
			avatarUrl = result.url;
			if (result.warning) {
				showStatus((v) => (avatarStatus = v), 'Photo set! Note: ' + result.warning, 'success', false);
			} else {
				showStatus((v) => (avatarStatus = v), 'Photo updated!', 'success');
			}
		}

		// Reset file input
		target.value = '';
	}

	async function handleRemoveAvatar() {
		showStatus((v) => (avatarStatus = v), 'Removing...', 'success', false);

		const { error } = await removeAvatar();
		if (error) {
			showStatus((v) => (avatarStatus = v), error, 'error', false);
		} else {
			setLocalAvatarUrl(null);
			avatarUrl = null;
			showStatus((v) => (avatarStatus = v), 'Photo removed.', 'success');
		}
	}

	// ============ DISPLAY NAME ============
	async function handleSaveName() {
		const trimmed = displayName.trim();
		if (!trimmed) {
			showStatus((v) => (nameStatus = v), 'Name cannot be empty.', 'error', false);
			return;
		}

		const { error } = await updateDisplayName(trimmed);
		if (error) {
			showStatus((v) => (nameStatus = v), error, 'error', false);
		} else {
			setLocalDisplayName(trimmed);
			showStatus((v) => (nameStatus = v), 'Name saved!', 'success');
		}
	}

	// ============ PASSWORD ============
	async function handleChangePassword() {
		if (!newPassword || !confirmPassword) {
			showStatus((v) => (passwordStatus = v), 'Please fill in both fields.', 'error', false);
			return;
		}
		if (newPassword.length < 6) {
			showStatus((v) => (passwordStatus = v), 'Password must be at least 6 characters.', 'error', false);
			return;
		}
		if (newPassword !== confirmPassword) {
			showStatus((v) => (passwordStatus = v), 'Passwords do not match.', 'error', false);
			return;
		}

		const { error } = await updatePassword(newPassword);
		if (error) {
			showStatus((v) => (passwordStatus = v), error, 'error', false);
		} else {
			showStatus((v) => (passwordStatus = v), 'Password updated!', 'success');
			newPassword = '';
			confirmPassword = '';
		}
	}

	// ============ PREFERENCES ============
	function handleLanguageChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		currentLang = val;
		setLanguage(val);
	}

	function handleSpeedChange(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		voiceSpeed = val;
		setVoiceSpeed(val);
	}

	// ============ SIGN OUT ============
	async function handleSignOut() {
		await signOut();
		goto('/');
	}

	// ============ LIFECYCLE ============
	onMount(async () => {
		const authed = await isAuthenticated();
		if (!authed) {
			goto('/');
			return;
		}

		// Load user info
		const user = await getUser();
		if (user) {
			email = user.email || '';
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

		const savedSpeed = await getVoiceSpeed();
		if (savedSpeed !== null && !isNaN(savedSpeed)) voiceSpeed = savedSpeed;

		isLoading = false;
	});
</script>

<svelte:head>
	<title>Settings - Misiro</title>
</svelte:head>

{#if !isLoading}
	<div class="settings-container">
		<a href="/" class="back-link">&larr; Back to Home</a>
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
					<button class="btn-secondary" onclick={() => fileInput?.click()}>Upload Photo</button>
					<input
						type="file"
						accept="image/*"
						bind:this={fileInput}
						onchange={handleAvatarUpload}
						style="display:none;"
					/>
					{#if avatarUrl}
						<button class="btn-secondary" onclick={handleRemoveAvatar}>Remove Photo</button>
					{/if}
				</div>
			</div>
			{#if avatarStatus}
				<div class="status-msg {avatarStatus.type}">{avatarStatus.text}</div>
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
			<button class="btn-primary" onclick={handleSaveName}>Save Name</button>
			{#if nameStatus}
				<div class="status-msg {nameStatus.type}">{nameStatus.text}</div>
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
			<button class="btn-primary" onclick={handleChangePassword}>Update Password</button>
			{#if passwordStatus}
				<div class="status-msg {passwordStatus.type}">{passwordStatus.text}</div>
			{/if}
		</div>

		<!-- Preferences Section -->
		<div class="settings-section">
			<h3><span class="section-icon">⚙</span> Preferences</h3>

			<div class="pref-row">
				<label for="pref-language">Language</label>
				<select id="pref-language" value={currentLang} onchange={handleLanguageChange}>
					<option value="fa">{'\u0641\u0627\u0631\u0633\u06CC'}</option>
					<option value="en">English</option>
				</select>
			</div>

			<div class="pref-row">
				<label for="pref-speed">Voice Speed</label>
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
		</div>

		<!-- Account Section -->
		<div class="settings-section">
			<h3><span class="section-icon">📧</span> Account</h3>

			<div class="form-group">
				<label>Email</label>
				<div class="account-email">{email || 'Loading...'}</div>
			</div>

			<button class="btn-danger" onclick={handleSignOut}>Sign Out</button>
		</div>
	</div>
{/if}

<style>
	.settings-container {
		max-width: 600px;
		margin: 0 auto;
		padding: 40px 20px;
		min-height: 100vh;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: #a0a0a0;
		text-decoration: none;
		font-size: 1rem;
		margin-bottom: 30px;
		transition: color 0.3s ease;
	}

	.back-link:hover {
		color: #e94560;
	}

	.settings-title {
		font-size: 2rem;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 30px;
	}

	.settings-section {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
		border-radius: 20px;
		padding: 30px;
		margin-bottom: 20px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.settings-section h3 {
		font-size: 1.2rem;
		margin-bottom: 20px;
		color: #e94560;
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

	.form-group label {
		display: block;
		font-size: 0.9rem;
		color: #a0a0a0;
		margin-bottom: 6px;
	}

	.form-group input[type='text'],
	.form-group input[type='password'] {
		width: 100%;
		padding: 12px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		font-size: 1rem;
		transition: border-color 0.3s ease;
	}

	.form-group input:focus {
		outline: none;
		border-color: #e94560;
	}

	.btn-primary {
		padding: 10px 24px;
		border-radius: 10px;
		border: none;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 20px rgba(233, 69, 96, 0.4);
	}

	.btn-secondary {
		padding: 10px 24px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: transparent;
		color: #fff;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-secondary:hover {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.2);
	}

	.btn-danger {
		padding: 10px 24px;
		border-radius: 10px;
		border: 1px solid rgba(255, 100, 100, 0.4);
		background: rgba(255, 50, 50, 0.1);
		color: #ff6b6b;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-danger:hover {
		background: rgba(255, 50, 50, 0.3);
		border-color: #ff6b6b;
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
		background: linear-gradient(135deg, #e94560, #ff6b6b);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		font-weight: 700;
		color: #fff;
		border: 4px solid rgba(255, 255, 255, 0.2);
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
		background: rgba(46, 204, 113, 0.2);
		color: #2ecc71;
		border: 1px solid rgba(46, 204, 113, 0.3);
	}

	.status-msg.error {
		background: rgba(233, 69, 96, 0.2);
		color: #ff6b6b;
		border: 1px solid rgba(233, 69, 96, 0.3);
	}

	.pref-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.pref-row:last-child {
		border-bottom: none;
	}

	.pref-row label {
		font-size: 1rem;
		color: #fff;
	}

	.pref-row select {
		padding: 8px 16px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.pref-row select option {
		background: #1a1a2e;
		color: #fff;
	}

	.speed-control {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.speed-control input[type='range'] {
		width: 120px;
		accent-color: #e94560;
	}

	.speed-value {
		font-size: 0.9rem;
		color: #e94560;
		font-weight: 600;
		min-width: 40px;
		text-align: center;
	}

	.account-email {
		font-size: 1rem;
		color: #a0a0a0;
		padding: 12px;
		background: rgba(255, 255, 255, 0.05);
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
