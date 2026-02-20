<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { generateScenarioSentences, constructUserPrompt, type GeneratedSentence } from '$services/ai-generator';

	// ============ TYPES ============
	interface Sentence {
		text: string;
		sentenceMeaning: string;
		words: Array<{ word: string; meaning: string }>;
		completed: boolean;
	}

	interface Scenario {
		name: string;
		description: string;
		sentences: Sentence[];
		prompt?: string;
	}

	interface LevelData {
		level: number;
		scenarios: Scenario[];
	}

	interface CourseData {
		levels: LevelData[];
	}

	// ============ STATE ============
	let courseData: CourseData = $state({
		levels: [
			{
				level: 1,
				scenarios: [
					{ name: 'Airport: Check-in', description: 'Checking in at the counter, showing passport, dropping bags', sentences: [] },
					{ name: 'Airport: Security', description: 'Going through security, taking off shoes, empty pockets', sentences: [] },
					{ name: 'Airport: Duty Free', description: 'Buying gifts or snacks in the duty-free shop', sentences: [] },
					{ name: 'Airport: Boarding', description: 'At the gate, boarding the plane, finding your seat', sentences: [] },
					{ name: 'Airport: Lost Luggage', description: 'Reporting lost bags at the service desk', sentences: [] }
				]
			}
		]
	});

	let currentLevel = $state(1);
	let currentScenarioIndex = $state(-1);
	let selectedSentences: Set<number> = $state(new Set());
	let isGenerating = $state(false);

	// File input ref
	let fileInput: HTMLInputElement | undefined = $state(undefined);

	// ============ DERIVED ============
	const currentLevelData = $derived(
		courseData.levels.find((l) => l.level === currentLevel)
	);

	const currentScenario = $derived(
		currentLevelData && currentScenarioIndex >= 0
			? currentLevelData.scenarios[currentScenarioIndex]
			: null
	);

	const sentences = $derived(currentScenario?.sentences || []);

	// ============ LEVEL MANAGEMENT ============
	function changeLevel(newLevel: number) {
		currentLevel = newLevel;
		currentScenarioIndex = -1;
		selectedSentences = new Set();
	}

	function addLevel() {
		const nextLevel = courseData.levels.length + 1;
		if (confirm(`Create Level ${nextLevel}?`)) {
			courseData.levels = [...courseData.levels, { level: nextLevel, scenarios: [] }];
			changeLevel(nextLevel);
		}
	}

	function handleLevelChange(e: Event) {
		changeLevel(parseInt((e.target as HTMLSelectElement).value));
	}

	// ============ SCENARIO MANAGEMENT ============
	function selectScenario(index: number) {
		currentScenarioIndex = index;
		selectedSentences = new Set();
	}

	function addScenario() {
		const name = prompt("Enter Scenario Name (e.g., 'At the Airport'):");
		if (!name) return;
		const description = prompt("Enter Description (e.g., 'Learn to check in'):") || '';

		if (!currentLevelData) return;

		currentLevelData.scenarios = [
			...currentLevelData.scenarios,
			{ name, description, sentences: [], prompt: '' }
		];
		// Trigger reactivity
		courseData = { ...courseData };
		selectScenario(currentLevelData.scenarios.length - 1);
	}

	function editScenario() {
		if (!currentScenario) return;
		const newName = prompt('Edit Name:', currentScenario.name);
		if (newName) currentScenario.name = newName;

		const newDesc = prompt('Edit Description:', currentScenario.description);
		if (newDesc !== null) currentScenario.description = newDesc;

		courseData = { ...courseData };
	}

	function deleteScenario(index: number) {
		if (!currentLevelData) return;
		if (!confirm(`Delete scenario "${currentLevelData.scenarios[index].name}"?`)) return;

		currentLevelData.scenarios.splice(index, 1);
		courseData = { ...courseData };

		if (currentScenarioIndex === index) {
			currentScenarioIndex = -1;
		} else if (currentScenarioIndex > index) {
			currentScenarioIndex--;
		}
	}

	// ============ SENTENCE MANAGEMENT ============
	async function generateDraft() {
		if (!currentScenario) return;

		isGenerating = true;
		try {
			const existing = currentScenario.sentences || [];

			let promptText = currentScenario.prompt || null;
			if (!promptText || promptText.trim() === '') {
				promptText = constructUserPrompt(
					currentScenario.name,
					currentScenario.description,
					1
				);
				currentScenario.prompt = promptText;
			}

			const newSentences = await generateScenarioSentences(
				currentLevel,
				currentScenario.name,
				currentScenario.description,
				1,
				existing as GeneratedSentence[],
				promptText
			);

			if ((newSentences as any).isFallback) {
				alert(`AI Generation Failed.\n\nError: ${(newSentences as any).errorMessage}\n\nAdding default offline examples instead.`);
			}

			currentScenario.sentences = [...currentScenario.sentences, ...newSentences];
			courseData = { ...courseData };
		} catch (error: any) {
			alert('Generation failed: ' + error.message);
		} finally {
			isGenerating = false;
		}
	}

	function addEmptySentence() {
		if (!currentScenario) return;
		currentScenario.sentences = [
			...currentScenario.sentences,
			{ text: 'New Sentence', sentenceMeaning: 'Meaning', words: [], completed: false }
		];
		courseData = { ...courseData };
	}

	function updateSentenceField(index: number, field: 'text' | 'sentenceMeaning', value: string) {
		if (!currentScenario || !currentScenario.sentences[index]) return;
		currentScenario.sentences[index][field] = value;
	}

	function deleteSentence(index: number) {
		if (!currentScenario) return;
		if (!confirm('Delete this sentence?')) return;
		currentScenario.sentences.splice(index, 1);
		selectedSentences = new Set();
		courseData = { ...courseData };
	}

	function toggleSelection(index: number) {
		const newSet = new Set(selectedSentences);
		if (newSet.has(index)) {
			newSet.delete(index);
		} else {
			newSet.add(index);
		}
		selectedSentences = newSet;
	}

	function deleteSelectedSentences() {
		if (!currentScenario || selectedSentences.size === 0) return;
		if (!confirm(`Delete ${selectedSentences.size} sentences?`)) return;

		const indices = Array.from(selectedSentences).sort((a, b) => b - a);
		for (const i of indices) {
			currentScenario.sentences.splice(i, 1);
		}
		selectedSentences = new Set();
		courseData = { ...courseData };
	}

	function handlePromptChange(e: Event) {
		if (currentScenario) {
			currentScenario.prompt = (e.target as HTMLTextAreaElement).value;
		}
	}

	// ============ FILE I/O ============
	function exportData() {
		const dataStr = JSON.stringify(courseData, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'course_data.json';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleImport(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(e.target?.result as string);
				if (!data.levels) throw new Error('Invalid format');

				courseData = data;
				currentLevel = courseData.levels[0]?.level || 1;
				currentScenarioIndex = -1;
				selectedSentences = new Set();
				alert('Database loaded successfully!');
			} catch (error: any) {
				alert('Invalid JSON file: ' + error.message);
			}
		};
		reader.readAsText(file);
	}

	function resetData() {
		if (confirm('Are you sure? This will delete all current data and restore defaults.')) {
			localStorage.removeItem('misiro_curator_backup');
			location.reload();
		}
	}

	// ============ LIFECYCLE ============
	let saveInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		// Load from localStorage
		const saved = localStorage.getItem('misiro_curator_backup');
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				if (parsed.levels) {
					courseData = parsed;
					if (courseData.levels.length === 0) {
						courseData.levels.push({
							level: 1,
							scenarios: [
								{ name: 'Airport: Check-in', description: 'Checking in at the counter', sentences: [] }
							]
						});
					}
				}
			} catch (e) {
				console.error('Data load error', e);
			}
		}

		// Auto-save every 5 seconds
		saveInterval = setInterval(() => {
			localStorage.setItem('misiro_curator_backup', JSON.stringify(courseData));
		}, 5000);
	});

	onDestroy(() => {
		if (saveInterval) clearInterval(saveInterval);
	});
</script>

<svelte:head>
	<title>Misiro Curator Dashboard</title>
</svelte:head>

<div class="app-container">
	<!-- Sidebar -->
	<aside class="sidebar">
		<div class="logo">
			<h1>Misiro <span>Curator</span></h1>
		</div>

		<div class="controls-section">
			<div class="level-controls">
				<select class="input-field" value={currentLevel.toString()} onchange={handleLevelChange}>
					{#each courseData.levels.sort((a, b) => a.level - b.level) as level}
						<option value={level.level.toString()}>Level {level.level}</option>
					{/each}
				</select>
				<button class="btn btn-icon" title="Add Level" onclick={addLevel}>+</button>
			</div>
			<div class="file-controls">
				<button class="btn btn-primary btn-sm" onclick={exportData}>Export JSON</button>
				<button class="btn btn-secondary btn-sm" onclick={() => fileInput?.click()}>Import JSON</button>
				<button
					class="btn btn-secondary btn-sm"
					style="color: var(--danger); border-color: var(--danger);"
					onclick={resetData}
				>Reset Data</button>
				<input
					type="file"
					accept=".json"
					bind:this={fileInput}
					onchange={handleImport}
					style="display: none;"
				/>
			</div>
		</div>

		<div class="nav-section">
			<div class="nav-header">
				<h3>Level {currentLevel} Scenarios</h3>
				<button class="btn btn-icon" title="Add Scenario" onclick={addScenario}>+</button>
			</div>
			<ul class="scenario-list">
				{#if currentLevelData && currentLevelData.scenarios.length > 0}
					{#each currentLevelData.scenarios as scenario, index}
						<li class="scenario-item" class:active={currentScenarioIndex === index}>
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span onclick={() => selectScenario(index)}>{scenario.name}</span>
							<button
								class="btn-icon-small delete-scenario"
								title="Delete"
								onclick={(e) => { e.stopPropagation(); deleteScenario(index); }}
							>&times;</button>
						</li>
					{/each}
				{:else}
					<li class="empty-list">No scenarios yet</li>
				{/if}
			</ul>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="main-content">
		<header class="top-bar">
			<div class="current-info">
				<div class="title-row">
					<h2>{currentScenario ? currentScenario.name : 'Select a Scenario'}</h2>
					{#if currentScenario}
						<button class="btn btn-icon btn-sm" title="Edit Scenario" onclick={editScenario}>
							✏️
						</button>
					{/if}
				</div>
				<p>{currentScenario ? currentScenario.description : 'Choose a scenario from the sidebar to start curating.'}</p>
			</div>
			<div class="actions">
				{#if selectedSentences.size > 0}
					<button
						class="btn btn-secondary"
						style="color: var(--danger); margin-right: 1rem;"
						onclick={deleteSelectedSentences}
					>
						🗑️ Delete Selected ({selectedSentences.size})
					</button>
				{/if}
				<button
					class="btn btn-accent"
					disabled={!currentScenario || isGenerating}
					onclick={generateDraft}
				>
					<span class="icon">✨</span>
					{sentences.length > 0 ? 'Generate New Sentence' : 'Generate Draft'}
				</button>
			</div>
		</header>

		<!-- Prompt Editor -->
		{#if currentScenario}
			<div class="prompt-section">
				<label for="prompt-input">AI Generation Prompt</label>
				<textarea
					id="prompt-input"
					class="prompt-input"
					placeholder="Enter custom prompt for AI generation..."
					value={currentScenario.prompt || ''}
					onchange={handlePromptChange}
				></textarea>
			</div>
		{/if}

		<!-- Sentences Grid -->
		<div class="sentences-grid">
			{#if !currentScenario}
				<div class="empty-state">
					<p>No scenario selected.</p>
				</div>
			{:else if sentences.length === 0}
				<div class="empty-state">
					<p>No sentences yet. Click "Generate Draft" to use AI.</p>
				</div>
			{:else}
				{#each sentences as sentence, index}
					<div class="sentence-card" style={selectedSentences.has(index) ? 'border-color: var(--accent);' : ''}>
						<div class="card-header">
							<div style="display: flex; gap: 10px; align-items: center;">
								<input
									type="checkbox"
									checked={selectedSentences.has(index)}
									onchange={() => toggleSelection(index)}
									style="width: 18px; height: 18px; cursor: pointer;"
								/>
								<span class="index">#{index + 1}</span>
							</div>
							<div class="card-actions">
								<button class="btn-icon btn-delete" onclick={() => deleteSentence(index)}>🗑️</button>
							</div>
						</div>
						<div class="input-group">
							<label>German Text</label>
							<input
								type="text"
								class="input-field"
								value={sentence.text}
								onchange={(e) => updateSentenceField(index, 'text', (e.target as HTMLInputElement).value)}
							/>
						</div>
						<div class="input-group">
							<label>English Meaning</label>
							<input
								type="text"
								class="input-field"
								value={sentence.sentenceMeaning}
								onchange={(e) => updateSentenceField(index, 'sentenceMeaning', (e.target as HTMLInputElement).value)}
							/>
						</div>
						{#if sentence.words && sentence.words.length > 0}
							<div class="words-list">
								{#each sentence.words as w}
									<div class="word-chip">
										{w.word} <span>{w.meaning}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		{#if currentScenario}
			<div class="add-sentence-section">
				<button class="btn btn-outline" onclick={addEmptySentence}>+ Add Manual Sentence</button>
			</div>
		{/if}
	</main>
</div>

<!-- Loading Overlay -->
{#if isGenerating}
	<div class="loading-overlay">
		<div class="spinner"></div>
	</div>
{/if}

<style>
	:root {
		--bg-dark: #0f172a;
		--bg-card: #1e293b;
		--text-primary: #f8fafc;
		--text-secondary: #94a3b8;
		--accent: #3b82f6;
		--accent-hover: #2563eb;
		--border: #334155;
		--success: #22c55e;
		--danger: #ef4444;
	}

	.app-container {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	/* Sidebar */
	.sidebar {
		width: 280px;
		background-color: var(--bg-card);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.logo h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 2rem;
	}

	.logo span {
		color: var(--accent);
	}

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--border);
	}

	.level-controls {
		display: flex;
		gap: 0.5rem;
	}

	.file-controls {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.nav-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.nav-section h3 {
		font-size: 0.875rem;
		text-transform: uppercase;
		color: var(--text-secondary);
		letter-spacing: 0.05em;
		margin: 0;
	}

	.scenario-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.scenario-item {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		color: var(--text-secondary);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.scenario-item:hover {
		background-color: rgba(59, 130, 246, 0.1);
		color: var(--text-primary);
	}

	.scenario-item.active {
		background-color: var(--accent);
		color: white;
	}

	.scenario-item span {
		flex: 1;
		cursor: pointer;
	}

	.delete-scenario {
		opacity: 0;
		transition: opacity 0.2s;
	}

	.scenario-item:hover .delete-scenario {
		opacity: 1;
	}

	.empty-list {
		color: var(--text-secondary);
		padding: 1rem;
		text-align: center;
		font-style: italic;
	}

	.btn-icon {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-secondary);
		width: 32px;
		height: 32px;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
	}

	.btn-icon:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.btn-icon-small {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 1rem;
	}

	.btn-icon-small:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}

	/* Main Content */
	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 2rem;
		overflow-y: auto;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.25rem;
	}

	.current-info h2 {
		font-size: 1.5rem;
		margin: 0;
	}

	.current-info p {
		color: var(--text-secondary);
		margin: 0;
	}

	.actions {
		display: flex;
		align-items: center;
	}

	/* Prompt Section */
	.prompt-section {
		margin-bottom: 2rem;
		background-color: var(--bg-card);
		padding: 1rem;
		border-radius: 0.5rem;
		border: 1px solid var(--border);
	}

	.prompt-section label {
		display: block;
		margin-bottom: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.prompt-input {
		width: 100%;
		background-color: var(--bg-dark);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.75rem;
		color: var(--text-primary);
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 0.875rem;
		resize: vertical;
		min-height: 100px;
		line-height: 1.5;
	}

	.prompt-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	/* Sentences Grid */
	.sentences-grid {
		display: grid;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.sentence-card {
		background-color: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		transition: border-color 0.2s;
	}

	.sentence-card:hover {
		border-color: var(--accent);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-delete {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		transition: color 0.2s;
	}

	.btn-delete:hover {
		color: var(--danger);
	}

	.index {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.input-group {
		margin-bottom: 1rem;
	}

	.input-group label {
		display: block;
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}

	.input-field {
		width: 100%;
		background-color: var(--bg-dark);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.5rem;
		color: var(--text-primary);
		font-family: inherit;
	}

	.input-field:focus {
		outline: none;
		border-color: var(--accent);
	}

	.words-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.word-chip {
		background-color: var(--bg-dark);
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.875rem;
		border: 1px solid var(--border);
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.word-chip span {
		color: var(--text-secondary);
		font-size: 0.75rem;
	}

	.add-sentence-section {
		margin-bottom: 2rem;
	}

	/* Buttons */
	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		border: none;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn-primary {
		background-color: var(--accent);
		color: white;
	}

	.btn-primary:hover {
		background-color: var(--accent-hover);
	}

	.btn-secondary {
		background-color: transparent;
		border: 1px solid var(--border);
		color: var(--text-primary);
	}

	.btn-secondary:hover {
		border-color: var(--text-secondary);
	}

	.btn-accent {
		background-color: var(--success);
		color: white;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-accent:hover:not(:disabled) {
		background-color: #16a34a;
	}

	.btn-outline {
		background-color: transparent;
		border: 1px dashed var(--border);
		color: var(--text-secondary);
		width: 100%;
	}

	.btn-outline:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.empty-state {
		text-align: center;
		padding: 4rem;
		color: var(--text-secondary);
		background-color: rgba(255, 255, 255, 0.02);
		border-radius: 1rem;
		border: 1px dashed var(--border);
	}

	/* Loading */
	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(15, 23, 42, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
