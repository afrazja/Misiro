// Misiro Curator Dashboard Logic

class CuratorApp {
    constructor() {
        this.aiGenerator = new AIContentGenerator();
        this.courseData = {
            levels: [
                {
                    level: 1,
                    scenarios: [
                        { name: "Airport: Check-in", description: "Checking in at the counter, showing passport, dropping bags", sentences: [] },
                        { name: "Airport: Security", description: "Going through security, taking off shoes, empty pockets", sentences: [] },
                        { name: "Airport: Duty Free", description: "Buying gifts or snacks in the duty-free shop", sentences: [] },
                        { name: "Airport: Boarding", description: "At the gate, boarding the plane, finding your seat", sentences: [] },
                        { name: "Airport: Lost Luggage", description: "Reporting lost bags at the service desk", sentences: [] }
                    ]
                }
            ]
        };
        this.currentLevel = 1;
        this.currentScenario = null;
        this.currentScenarioIndex = -1;
        this.selectedSentences = new Set(); // Track selected indices

        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadInitialData();
        this.renderLevelSelect();
        this.renderScenarioList();
    }

    cacheDOM() {
        this.dom = {
            levelSelect: document.getElementById('level-select'),
            btnAddLevel: document.getElementById('btn-add-level'),
            levelTitle: document.getElementById('level-title'),
            scenarioList: document.getElementById('scenario-list'),
            btnAddScenario: document.getElementById('btn-add-scenario'),

            currentTitle: document.getElementById('current-scenario-title'),
            currentDesc: document.getElementById('current-scenario-desc'),
            btnEditScenario: document.getElementById('btn-edit-scenario'),

            sentencesContainer: document.getElementById('sentences-container'),
            btnGenerate: document.getElementById('btn-generate'),
            btnAddManual: document.getElementById('btn-add-manual'),
            btnDeleteSelected: document.getElementById('btn-delete-selected'),

            btnExport: document.getElementById('btn-export'),
            btnImport: document.getElementById('btn-import'),
            fileImport: document.getElementById('file-import'),

            promptSection: document.getElementById('prompt-section'),
            promptInput: document.getElementById('prompt-input')
        };
    }

    bindEvents() {
        this.dom.levelSelect.addEventListener('change', (e) => this.changeLevel(parseInt(e.target.value)));
        this.dom.btnAddLevel.addEventListener('click', () => this.addLevel());
        this.dom.btnAddScenario.addEventListener('click', () => this.addScenario());
        this.dom.btnEditScenario.addEventListener('click', () => this.editScenario());

        this.dom.btnGenerate.addEventListener('click', () => this.generateDraft());
        this.dom.btnDeleteSelected.addEventListener('click', () => this.deleteSelectedSentences());
        this.dom.btnExport.addEventListener('click', () => this.exportData());
        this.dom.btnImport.addEventListener('click', () => this.dom.fileImport.click());
        this.dom.fileImport.addEventListener('change', (e) => this.importData(e));

        const btnReset = document.getElementById('btn-reset');
        if (btnReset) btnReset.addEventListener('click', () => this.resetData());

        this.dom.btnAddManual.addEventListener('click', () => this.addEmptySentence());

        this.dom.promptInput.addEventListener('change', (e) => {
            if (this.currentScenario) {
                this.currentScenario.prompt = e.target.value;
            }
        });
    }

    resetData() {
        if (confirm('Are you sure? This will delete all current data and restore defaults.')) {
            localStorage.removeItem('misiro_curator_backup');
            location.reload();
        }
    }

    // --- Level Management ---

    renderLevelSelect() {
        this.dom.levelSelect.innerHTML = '';
        this.courseData.levels.sort((a, b) => a.level - b.level).forEach(level => {
            const option = document.createElement('option');
            option.value = level.level;
            option.textContent = `Level ${level.level}`;
            option.selected = level.level === this.currentLevel;
            this.dom.levelSelect.appendChild(option);
        });
        this.dom.levelTitle.textContent = `Level ${this.currentLevel} Scenarios`;
    }

    changeLevel(newLevel) {
        this.currentLevel = newLevel;
        this.currentScenario = null;
        this.currentScenarioIndex = -1;
        this.renderLevelSelect();
        this.renderScenarioList();
        this.clearMainView();
    }

    addLevel() {
        const nextLevel = this.courseData.levels.length + 1;
        if (confirm(`Create Level ${nextLevel}?`)) {
            this.courseData.levels.push({
                level: nextLevel,
                scenarios: []
            });
            this.changeLevel(nextLevel);
        }
    }

    // --- Scenario Management ---

    getCurrentLevelData() {
        return this.courseData.levels.find(l => l.level === this.currentLevel);
    }

    renderScenarioList() {
        this.dom.scenarioList.innerHTML = '';
        const levelData = this.getCurrentLevelData();

        if (!levelData || levelData.scenarios.length === 0) {
            this.dom.scenarioList.innerHTML = '<li class="empty-list">No scenarios yet</li>';
            return;
        }

        levelData.scenarios.forEach((scenario, index) => {
            const li = document.createElement('li');
            li.className = 'scenario-item';
            if (this.currentScenarioIndex === index) li.classList.add('active');

            li.innerHTML = `
                <span>${scenario.name}</span>
                <button class="btn-icon-small delete-scenario" title="Delete">×</button>
            `;

            // Click on name to select
            li.querySelector('span').onclick = () => this.selectScenario(index);

            // Click on X to delete
            li.querySelector('.delete-scenario').onclick = (e) => {
                e.stopPropagation();
                this.deleteScenario(index);
            };

            this.dom.scenarioList.appendChild(li);
        });
    }

    selectScenario(index) {
        const levelData = this.getCurrentLevelData();
        this.currentScenario = levelData.scenarios[index];
        this.currentScenarioIndex = index;

        this.selectedSentences.clear(); // Reset selection on switch

        // Update UI
        this.renderScenarioList(); // To update active class

        this.dom.currentTitle.textContent = this.currentScenario.name;
        this.dom.currentDesc.textContent = this.currentScenario.description;
        this.dom.btnEditScenario.style.display = 'inline-block';

        this.dom.btnGenerate.disabled = false;
        this.dom.btnAddManual.disabled = false;

        // Handle Prompt Logic
        this.renderSentences();
    }

    addScenario() {
        try {
            const name = prompt("Enter Scenario Name (e.g., 'At the Airport'):");
            if (!name) return;

            const description = prompt("Enter Description (e.g., 'Learn to check in'):");

            let levelData = this.getCurrentLevelData();

            // Safety check: if level data is missing, create it
            if (!levelData) {
                if (!this.courseData.levels) this.courseData.levels = [];
                levelData = { level: this.currentLevel, scenarios: [] };
                this.courseData.levels.push(levelData);
            }

            levelData.scenarios.push({
                id: levelData.scenarios.length + 1,
                name: name,
                description: description || "",
                sentences: [],
                prompt: "" // Blank by default for new scenarios as requested
            });

            this.renderScenarioList();
            this.selectScenario(levelData.scenarios.length - 1);
        } catch (error) {
            console.error(error);
            alert("Error adding scenario: " + error.message);
        }
    }

    editScenario() {
        if (!this.currentScenario) return;

        const newName = prompt("Edit Name:", this.currentScenario.name);
        if (newName) {
            this.currentScenario.name = newName;
            this.dom.currentTitle.textContent = newName;
        }

        const newDesc = prompt("Edit Description:", this.currentScenario.description);
        if (newDesc !== null) {
            this.currentScenario.description = newDesc;
            this.dom.currentDesc.textContent = newDesc;
        }

        this.renderScenarioList();
    }

    clearMainView() {
        this.currentScenario = null;
        this.currentScenarioIndex = -1;
        this.dom.currentTitle.textContent = "Select a Scenario";
        this.dom.currentDesc.textContent = "Choose a scenario from the sidebar to start curating.";
        this.dom.btnEditScenario.style.display = 'none';
        this.dom.sentencesContainer.innerHTML = '<div class="empty-state"><p>No scenario selected.</p></div>';
        this.dom.btnGenerate.disabled = true;
        this.dom.btnAddManual.disabled = true;
        this.dom.promptSection.style.display = 'none';
    }

    // --- Sentence Management ---

    renderSentences() {
        if (!this.currentScenario) return;

        const sentences = this.currentScenario.sentences || [];
        this.dom.sentencesContainer.innerHTML = '';

        // Update Batch Delete Button Visibility
        this.updateBatchDeleteButton();

        if (sentences.length === 0) {
            this.dom.sentencesContainer.innerHTML = `
                <div class="empty-state">
                    <p>No sentences yet. Click "Generate Draft" to use AI.</p>
                </div>
            `;
            return;
        }

        sentences.forEach((sentence, index) => {
            const card = this.createSentenceCard(sentence, index);
            this.dom.sentencesContainer.appendChild(card);
        });

        // Update button text to single
        this.dom.btnGenerate.innerHTML = `<span class="icon">✨</span> Generate New Sentence`;
    }

    updateBatchDeleteButton() {
        if (this.selectedSentences.size > 0) {
            this.dom.btnDeleteSelected.style.display = 'inline-block';
            this.dom.btnDeleteSelected.innerHTML = `🗑️ Delete Selected (${this.selectedSentences.size})`;
        } else {
            this.dom.btnDeleteSelected.style.display = 'none';
        }
    }

    createSentenceCard(sentence, index) {
        const div = document.createElement('div');
        div.className = 'sentence-card';

        // Check if selected
        const isSelected = this.selectedSentences.has(index);
        if (isSelected) div.style.borderColor = 'var(--accent)';

        div.innerHTML = `
            <div class="card-header">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                        onchange="curator.toggleSentenceSelection(${index})" 
                        style="width: 18px; height: 18px; cursor: pointer;">
                    <span class="index">#${index + 1}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-delete" onclick="curator.deleteSentence(${index})">🗑️</button>
                </div>
            </div>
            <div class="input-group">
                <label>German Text</label>
                <input type="text" class="input-field" value="${sentence.text}" onchange="curator.updateSentence(${index}, 'text', this.value)">
            </div>
            <div class="input-group">
                <label>English Meaning</label>
                <input type="text" class="input-field" value="${sentence.sentenceMeaning}" onchange="curator.updateSentence(${index}, 'sentenceMeaning', this.value)">
            </div>
            <div class="words-list">
                ${(sentence.words || []).map(w => `
                    <div class="word-chip">
                        ${w.word} <span>${w.meaning}</span>
                    </div>
                `).join('')}
            </div>
        `;
        return div;
    }

    async generateDraft() {
        if (!this.currentScenario) return;

        this.showLoading(true);
        try {
            const existing = this.currentScenario.sentences || [];

            let promptText = this.currentScenario.prompt;

            // Auto-generate prompt if missing (Better UX)
            if (!promptText || promptText.trim() === "") {
                console.log("Prompt missing, auto-generating default...");
                promptText = this.aiGenerator.constructPrompt(
                    this.currentLevel,
                    this.currentScenario.name,
                    this.currentScenario.description,
                    1 // Generate 1 at a time (optimized)
                );
                this.currentScenario.prompt = promptText;
                this.dom.promptInput.value = promptText;
            }

            const newSentences = await this.aiGenerator.generateScenarioSentences(
                this.currentLevel,
                this.currentScenario.name,
                this.currentScenario.description,
                1, // Generate 1 at a time (optimized)
                existing,
                promptText // Pass the custom prompt
            );

            if (newSentences.isFallback) {
                alert(`⚠️ AI Generation Failed.\n\nError: ${newSentences.errorMessage}\n\nAdding default offline examples instead.`);
            }

            // Append new sentences
            if (!this.currentScenario.sentences) this.currentScenario.sentences = [];
            this.currentScenario.sentences.push(...newSentences);

            this.renderSentences();
        } catch (error) {
            alert('Generation failed: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    addEmptySentence() {
        const empty = {
            text: "New Sentence",
            sentenceMeaning: "Meaning",
            words: [],
            completed: false
        };
        if (!this.currentScenario.sentences) this.currentScenario.sentences = [];
        this.currentScenario.sentences.push(empty);
        this.renderSentences();
    }

    updateSentence(index, field, value) {
        if (this.currentScenario && this.currentScenario.sentences[index]) {
            this.currentScenario.sentences[index][field] = value;
        }
    }

    deleteSentence(index) {
        if (!confirm('Delete this sentence?')) return;
        if (this.currentScenario) {
            this.currentScenario.sentences.splice(index, 1);
            this.selectedSentences.clear(); // Clear selection on delete to avoid index issues
            this.renderSentences();
        }
    }

    toggleSentenceSelection(index) {
        if (this.selectedSentences.has(index)) {
            this.selectedSentences.delete(index);
        } else {
            this.selectedSentences.add(index);
        }
        this.renderSentences(); // Re-render to show selection state/button
    }

    deleteSelectedSentences() {
        if (this.selectedSentences.size === 0) return;

        if (!confirm(`Delete ${this.selectedSentences.size} sentences?`)) return;

        // Convert set to array and sort descending to splice correctly
        const indicesToDelete = Array.from(this.selectedSentences).sort((a, b) => b - a);

        indicesToDelete.forEach(index => {
            this.currentScenario.sentences.splice(index, 1);
        });

        this.selectedSentences.clear();
        this.renderSentences();
    }

    // --- File I/O ---

    exportData() {
        const dataStr = JSON.stringify(this.courseData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = "course_data.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Basic validation
                if (!data.levels) throw new Error("Invalid format");

                this.courseData = data;

                // Reset view to Level 1
                this.currentLevel = this.courseData.levels[0]?.level || 1;
                this.renderLevelSelect();
                this.changeLevel(this.currentLevel);

                alert('Database loaded successfully!');
            } catch (error) {
                alert('Invalid JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    loadInitialData() {
        // Try to load from localStorage as a temporary convenience
        const saved = localStorage.getItem('misiro_curator_backup');
        if (saved) {
            try {
                this.courseData = JSON.parse(saved);
                // Ensure levels exist
                if (!this.courseData.levels) this.courseData.levels = [];
                // Ensure at least one level exists if empty
                if (this.courseData.levels.length === 0) {
                    this.courseData.levels.push({
                        level: 1,
                        scenarios: [
                            { name: "Airport: Check-in", description: "Checking in at the counter, showing passport, dropping bags", sentences: [] },
                            { name: "Airport: Security", description: "Going through security, taking off shoes, empty pockets", sentences: [] },
                            { name: "Airport: Duty Free", description: "Buying gifts or snacks in the duty-free shop", sentences: [] },
                            { name: "Airport: Boarding", description: "At the gate, boarding the plane, finding your seat", sentences: [] },
                            { name: "Airport: Lost Luggage", description: "Reporting lost bags at the service desk", sentences: [] }
                        ]
                    });
                }
            } catch (e) {
                console.error("Data load error", e);
            }
        }

        // Auto-save to local storage on changes
        setInterval(() => {
            localStorage.setItem('misiro_curator_backup', JSON.stringify(this.courseData));
        }, 5000);
    }

    showLoading(show) {
        if (show) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        } else {
            const overlay = document.querySelector('.loading-overlay');
            if (overlay) overlay.remove();
        }
    }
}

// Initialize
const curator = new CuratorApp();
