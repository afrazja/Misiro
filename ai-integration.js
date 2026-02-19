// AI Integration with DeepSeek API (Cloud)
// Replaces local Ollama for better performance and quality

class AIContentGenerator {
    constructor() {
        this.apiEndpoint = 'http://localhost:3000/chat'; // Local Proxy
        this.model = 'llama3.1:8b';
    }

    /**
     * Generate sentences for a specific scenario and level
     */
    async generateScenarioSentences(level, scenarioName, scenarioDescription, sentenceCount = 5, existingSentences = [], promptText = null) {
        const maxWords = this.getMaxWordsForLevel(level);

        // Construct the prompt
        let systemInstruction = this.constructSystemPrompt(level);
        let userPrompt = promptText;

        if (!userPrompt) {
            userPrompt = this.constructUserPrompt(scenarioName, scenarioDescription, sentenceCount);
        }

        try {
            console.log(`Asking DeepSeek...`);
            const responseText = await this.callDeepSeekAPI(systemInstruction, userPrompt);
            const candidates = this.parseResponse(responseText);

            // Validate and clean
            return this.validateSentences(candidates, maxWords, sentenceCount, existingSentences);

        } catch (error) {
            console.error(`DeepSeek API Error:`, error);
            const fallback = this.getFallbackSentences(scenarioName);
            fallback.isFallback = true;
            fallback.errorMessage = error.message; // Pass detail to UI
            return fallback;
        }
    }

    constructSystemPrompt(level) {
        return `You are an expert German language teacher. 
Your goal is to generate unique, natural, and modern German sentences for a ${this.getLevelDifficulty(level)} level student.
ALWAYS return ONLY a raw JSON array. Do not wrap in markdown code blocks.`;
    }

    constructUserPrompt(scenarioName, scenarioDescription, count) {
        return `Topic: "${scenarioName}"
Specific Situation: "${scenarioDescription}"

Generate ${count} sentences that fit this specific situation.

Constraints:
1. Sentences must be unique and varied.
2. Ensure grammar is correct and natural.
3. Return ONLY a JSON array.

Format:
[
  {
    "text": "German sentence",
    "sentenceMeaning": "English translation",
    "words": [
      {"word": "GermanWord", "meaning": "EnglishMeaning"}
    ]
  }
]`;
    }

    constructPrompt(level, scenarioName, scenarioDescription, sentenceCount) {
        // Helper for curator.js display - combines system and user for preview
        return this.constructUserPrompt(scenarioName, scenarioDescription, sentenceCount);
    }

    async callDeepSeekAPI(systemPrompt, userPrompt) {
        const requestBody = {
            model: this.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 1.2, // High creativity
            response_format: { type: "json_object" } // DeepSeek supports this
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 mins for local 8B

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API call failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    parseResponse(response) {
        try {
            // Remove markdown code blocks if present
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            // Handle { "sentences": [...] } wrapper if present
            if (parsed.sentences && Array.isArray(parsed.sentences)) {
                return parsed.sentences;
            }
            if (Array.isArray(parsed)) {
                return parsed;
            }
            // Handle numbered object
            if (typeof parsed === 'object') {
                return Object.values(parsed).filter(v => v.text && v.words);
            }

            // Handle single object return
            if (parsed.text && parsed.words) {
                return [parsed];
            }

            return [];
        } catch (e) {
            console.error("JSON Parse Error", e);
            console.log("Raw Response", response);
            return [];
        }
    }

    validateSentences(sentences, maxWords, count, existingSentences) {
        const valid = [];
        const existingTexts = new Set(existingSentences.map(s => s.text.toLowerCase().trim()));

        for (const s of sentences) {
            if (!s.text) continue;
            const norm = s.text.toLowerCase().trim();

            if (existingTexts.has(norm)) continue;

            // Enforce max words
            const words = s.text.split(' ');
            if (words.length > maxWords) {
                s.text = words.slice(0, maxWords).join(' ');
            }
            if (!s.sentenceMeaning) s.sentenceMeaning = s.text;
            if (!s.words) s.words = []; // Default to empty
            s.completed = false;

            valid.push(s);
            existingTexts.add(norm);

            if (valid.length >= count) break;
        }
        return valid;
    }

    // ... Helpers
    getMaxWordsForLevel(level) {
        if (level <= 10) return 6;
        if (level <= 30) return 8;
        if (level <= 50) return 10;
        if (level <= 70) return 12;
        return 15;
    }

    getLevelDifficulty(level) {
        if (level <= 10) return 'Beginner - Very simple sentences';
        if (level <= 30) return 'Elementary - Simple everyday phrases';
        if (level <= 50) return 'Intermediate - More complex structures';
        if (level <= 70) return 'Upper Intermediate - Natural conversations';
        return 'Advanced - Complex grammar and vocabulary';
    }

    getFallbackSentences(scenarioName) {
        return [
            { text: "Hallo!", sentenceMeaning: "Hello!", words: [{ word: "Hallo", meaning: "Hello" }], completed: false },
            { text: "Danke!", sentenceMeaning: "Thank you!", words: [{ word: "Danke", meaning: "Thank you" }], completed: false }
        ];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIContentGenerator;
}
