// Wordridge - Game Logic
// Dictionary will be loaded from dictionary.json

class Wordridge {
    constructor() {
        this.dictionary = null;
        this.startWord = '';
        this.goalWord = '';
        this.currentWord = '';
        this.jumpCount = 0;
        this.path = [];
        this.gameWon = false;
        this.pairHistoryKey = 'wordridge_pair_history';
        this.db = null; // Firestore database reference
        this.useFirebase = false; // Flag to check if Firebase is available

        // DOM elements
        this.elements = {
            goalWord: document.getElementById('goalWord'),
            goalDefinition: document.getElementById('goalDefinition'),
            currentWord: document.getElementById('currentWord'),
            partOfSpeech: document.getElementById('partOfSpeech'),
            definition: document.getElementById('definition'),
            jumpCount: document.getElementById('jumpCount'),
            path: document.getElementById('path'),
            winModal: document.getElementById('winModal'),
            finalJumps: document.getElementById('finalJumps'),
            finalPath: document.getElementById('finalPath'),
            shareFeedback: document.getElementById('shareFeedback'),
            shareBtn: document.getElementById('shareBtn'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            answerSection: document.getElementById('answerSection'),
            answerJumps: document.getElementById('answerJumps'),
            answerPath: document.getElementById('answerPath'),
            toggleAnswerSectionBtn: document.getElementById('toggleAnswerSectionBtn'),
            collapsibleContent: document.getElementById('collapsibleContent'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            countdown: document.getElementById('countdown'),
            suggestWordBtn: document.getElementById('suggestWordBtn'),
            suggestionModal: document.getElementById('suggestionModal'),
            suggestWordInput: document.getElementById('suggestWordInput'),
            submitSuggestionBtn: document.getElementById('submitSuggestionBtn'),
            suggestedWordsList: document.getElementById('suggestedWordsList'),
            closeSuggestionModalBtn: document.getElementById('closeSuggestionModalBtn'),
            prevPageBtn: document.getElementById('prevPageBtn'),
            nextPageBtn: document.getElementById('nextPageBtn'),
            pageInfo: document.getElementById('pageInfo')
        };
        
        this.currentPage = 1;
        this.wordsPerPage = 20;
    }

    async loadDictionary() {
        try {
            const response = await fetch('dictionary.json');
            if (!response.ok) {
                throw new Error(`Failed to load dictionary: ${response.statusText}`);
            }
            this.dictionary = await response.json();
            return true;
        } catch (error) {
            console.error('Error loading dictionary:', error);
            this.elements.definition.textContent = 'Error loading dictionary. Please refresh the page.';
            return false;
        }
    }

    async init() {
        // Initialize Firebase if available
        if (typeof window.initializeFirebase === 'function') {
            this.useFirebase = window.initializeFirebase();
            this.db = window.getFirestoreDB();
            if (this.useFirebase) {
                console.log('✓ Using Firestore for word suggestions');
            } else {
                console.warn('⚠ Firebase not configured, falling back to localStorage');
            }
        } else {
            console.warn('⚠ Firebase SDK not loaded, using localStorage');
        }
        
        const loaded = await this.loadDictionary();
        if (loaded) {
            // Show loading spinner
            this.elements.loadingSpinner.style.display = 'flex';
            this.elements.definition.style.display = 'none';
            
            // Use setTimeout to let UI update before heavy computation
            setTimeout(() => {
            this.startDailyChallenge();
                this.elements.loadingSpinner.style.display = 'none';
                this.elements.definition.style.display = 'block';
            }, 10);
        }
        
        // Setup event listeners after game is initialized
        this.setupEventListeners();
        
        // Display existing suggestions
        await this.displaySuggestedWords();
    }

    setupEventListeners() {
        this.elements.shareBtn.addEventListener('click', () => this.shareResult());
        this.elements.playAgainBtn.addEventListener('click', () => {
            this.closeWinModal();
        });
        
        // Word suggestion modal listeners
        this.elements.suggestWordBtn.addEventListener('click', () => this.openSuggestionModal());
        this.elements.closeSuggestionModalBtn.addEventListener('click', () => this.closeSuggestionModal());
        this.elements.submitSuggestionBtn.addEventListener('click', () => this.submitWordSuggestion());
        this.elements.suggestWordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitWordSuggestion();
            }
        });
        
        // Pagination listeners
        this.elements.prevPageBtn.addEventListener('click', () => this.changePage(-1));
        this.elements.nextPageBtn.addEventListener('click', () => this.changePage(1));
        
        // Answer section collapse toggle
        if (this.elements.toggleAnswerSectionBtn) {
            this.elements.toggleAnswerSectionBtn.addEventListener('click', () => {
                this.toggleAnswerSection();
            });
        } else {
            console.error('toggleAnswerSectionBtn element not found in DOM');
        }

        // Close modals on overlay click
        this.elements.winModal.addEventListener('click', (e) => {
            if (e.target === this.elements.winModal) {
                this.closeWinModal();
            }
        });
        
        this.elements.suggestionModal.addEventListener('click', (e) => {
            if (e.target === this.elements.suggestionModal) {
                this.closeSuggestionModal();
            }
        });
        
        // Start countdown timer
        this.startCountdownTimer();
    }

    // Get pair history from localStorage
    getPairHistory() {
        try {
            const history = localStorage.getItem(this.pairHistoryKey);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error('Error reading pair history:', e);
            return [];
        }
    }

    // Save pair history to localStorage (keep only last 100)
    savePairHistory(history) {
        try {
            // Keep only the last 100 pairs
            const trimmedHistory = history.slice(-100);
            localStorage.setItem(this.pairHistoryKey, JSON.stringify(trimmedHistory));
        } catch (e) {
            console.error('Error saving pair history:', e);
        }
    }

    // Add a pair to history
    addPairToHistory(startWord, goalWord) {
        const history = this.getPairHistory();
        const pairKey = `${startWord.toLowerCase()}|${goalWord.toLowerCase()}`;
        
        // Remove if already exists (to avoid duplicates)
        const filtered = history.filter(p => p !== pairKey);
        
        // Add to end
        filtered.push(pairKey);
        
        // Save (will trim to 100)
        this.savePairHistory(filtered);
    }

    // Check if a pair is in history
    isPairInHistory(startWord, goalWord) {
        const history = this.getPairHistory();
        const pairKey = `${startWord.toLowerCase()}|${goalWord.toLowerCase()}`;
        return history.includes(pairKey);
    }

    // Seeded random number generator for daily challenges
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    getDayNumber() {
        // Days since a fixed start date (Jan 1, 2024)
        const startDate = new Date('2024-01-01');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    
    // Get time until next puzzle (0 AM)
    getTimeUntilNextPuzzle() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow - now;
    }
    
    // Get time until solution is available (22 hours after 0 AM = 10 PM)
    getTimeUntilSolution() {
        const now = new Date();
        const today = new Date(now);
        today.setHours(22, 0, 0, 0); // 10 PM today
        
        if (now >= today) {
            // Past 10 PM today, solution is available
            return 0;
        }
        return today - now;
    }
    
    // Check if solution is available
    isSolutionAvailable() {
        const now = new Date();
        const hours = now.getHours();
        return hours >= 22; // Available from 10 PM onwards
    }
    
    // Start countdown timer that updates every second
    startCountdownTimer() {
        this.updateCountdown();
        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }
    
    // Update countdown display
    updateCountdown() {
        const timeUntilSolution = this.getTimeUntilSolution();
        
        if (timeUntilSolution <= 0) {
            // Solution is available - automatically reveal it
            this.elements.countdown.innerHTML = '<span style="color: var(--success);">✓ Solution revealed!</span>';
            
            // Auto-reveal the answer path if we have it
            if (this.shortestPathResult && this.shortestPathResult.path) {
                this.renderAnswerPath(this.shortestPathResult.path);
            }
        } else {
            // Show countdown
            const hours = Math.floor(timeUntilSolution / (1000 * 60 * 60));
            const minutes = Math.floor((timeUntilSolution % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeUntilSolution % (1000 * 60)) / 1000);
            
            this.elements.countdown.innerHTML = `Solution available in: <strong>${hours}h ${minutes}m ${seconds}s</strong>`;
        }
    }

    startDailyChallenge() {
        const dayNumber = this.getDayNumber();
        const words = Object.keys(this.dictionary).filter(word => {
            const definition = this.dictionary[word];
            return definition && !definition.toLowerCase().includes('definition not available');
        });

        if (words.length < 2) {
            this.elements.definition.textContent = 'Not enough words in dictionary.';
            return;
        }

        // Use day number as seed to get consistent start/goal words
        // Try multiple seed offsets until we find a valid pair
        let startWord, goalWord;
        let seedOffset = 0;
        let maxAttempts = 100; // Prevent infinite loop
        
        while (maxAttempts > 0) {
            const seed1 = dayNumber * 1000 + seedOffset;
            const seed2 = dayNumber * 1000 + 500 + seedOffset;

        const startIndex = Math.floor(this.seededRandom(seed1) * words.length);
        let goalIndex = Math.floor(this.seededRandom(seed2) * words.length);

        // Ensure goal is different from start
        if (goalIndex === startIndex) {
            goalIndex = (goalIndex + 1) % words.length;
        }

            startWord = words[startIndex];
            goalWord = words[goalIndex];

            // Check if path exists between these words
            const result = this.findShortestPath(startWord, goalWord);
            if (result) {
                // Found a valid pair!
                break;
            }

            seedOffset += 1;
            maxAttempts--;
        }

        if (maxAttempts === 0) {
            // Fallback: just use the last pair (should be rare)
            console.warn('Could not find connected word pair after 100 attempts');
        }

        this.startWord = startWord;
        this.goalWord = goalWord;

        this.resetGame();
    }

    newRandomGame() {
        // Show loading spinner
        this.elements.loadingSpinner.style.display = 'flex';
        this.elements.definition.style.display = 'none';
        this.elements.newGameBtn.disabled = true;
        this.elements.newGameBtn.textContent = 'Loading...';
        
        // Use setTimeout to let UI update before heavy computation
        setTimeout(() => {
        const words = Object.keys(this.dictionary).filter(word => {
            const definition = this.dictionary[word];
            return definition && !definition.toLowerCase().includes('definition not available');
        });

        if (words.length < 2) {
            return;
        }

            let startWord, goalWord;
            let maxAttempts = 200; // Try up to 200 random pairs (increased since we filter history)

            while (maxAttempts > 0) {
        const startIndex = Math.floor(Math.random() * words.length);
        let goalIndex = Math.floor(Math.random() * words.length);

        while (goalIndex === startIndex) {
            goalIndex = Math.floor(Math.random() * words.length);
        }

                startWord = words[startIndex];
                goalWord = words[goalIndex];

                // Check if path exists between these words
                const result = this.findShortestPath(startWord, goalWord);
                if (result) {
                    // Check if this pair is in history
                    if (!this.isPairInHistory(startWord, goalWord)) {
                        // Found a valid pair that's not in history!
                        break;
                    }
                    // If in history, continue searching
                }

                maxAttempts--;
            }

            if (maxAttempts === 0) {
                // Fallback: just use the last pair (should be rare)
                console.warn('Could not find connected word pair after 50 attempts');
            }

            this.startWord = startWord;
            this.goalWord = goalWord;

            // Add this pair to history
            if (startWord && goalWord) {
                this.addPairToHistory(startWord, goalWord);
            }

            // Hide spinner and show definition
            this.elements.loadingSpinner.style.display = 'none';
            this.elements.definition.style.display = 'block';

            // Re-enable button
            this.elements.newGameBtn.disabled = false;
            this.elements.newGameBtn.textContent = 'New Game';

        this.resetGame();
        }, 10);
    }

    resetGame() {
        this.currentWord = this.startWord;
        this.jumpCount = 0;
        this.path = [this.startWord];
        this.gameWon = false;

        // Always show answer section with shortest path info
        const content = document.getElementById('collapsibleContent');
        if (content) {
            content.style.display = 'block';
        }
        this.elements.toggleAnswerSectionBtn.classList.remove('collapsed');
        this.elements.toggleAnswerSectionBtn.querySelector('.collapse-text').textContent = 'Hide';
        document.querySelector('.collapse-control').classList.add('visible');
        
        // Calculate and store the shortest path
        this.shortestPathResult = this.findShortestPath(this.startWord, this.goalWord);
        
        if (this.shortestPathResult) {
            this.elements.answerJumps.textContent = this.shortestPathResult.jumps;
            
            // Show path only if solution is available
            if (this.isSolutionAvailable()) {
                this.renderAnswerPath(this.shortestPathResult.path);
            }
        }
        
        // Ensure definition is visible and spinner is hidden
        this.elements.definition.style.display = 'block';
        this.elements.loadingSpinner.style.display = 'none';

        this.updateUI();
    }

    toggleAnswerSection() {
        const content = document.getElementById('collapsibleContent');
        
        if (!content || !this.elements.toggleAnswerSectionBtn) {
            console.error('Toggle button or collapsible content not found');
            return;
        }
        
        // Check current display state
        const isHidden = content.style.display === 'none';
        const collapseText = this.elements.toggleAnswerSectionBtn.querySelector('.collapse-text');
        
        if (isHidden) {
            // Show
            content.style.display = 'block';
            this.elements.toggleAnswerSectionBtn.classList.remove('collapsed');
            if (collapseText) {
                collapseText.textContent = 'Hide';
            }
        } else {
            // Hide
            content.style.display = 'none';
            this.elements.toggleAnswerSectionBtn.classList.add('collapsed');
            if (collapseText) {
                collapseText.textContent = 'Show';
            }
        }
    }

    updateUI() {
        // Update goal word
        this.elements.goalWord.textContent = this.goalWord.toUpperCase();

        // Update goal definition (plain text, not clickable)
        const goalDef = this.dictionary[this.goalWord];
        this.elements.goalDefinition.textContent = goalDef || 'Definition not found.';

        // Update current word
        this.elements.currentWord.textContent = this.currentWord.toUpperCase();

        // Update part of speech (no longer available in simple dictionary format)
        this.elements.partOfSpeech.textContent = '';

        // Update definition with clickable words
        this.renderDefinition();

        // Update jump count
        this.elements.jumpCount.textContent = this.jumpCount;

        // Update path
        this.renderPath();
    }

    renderDefinition() {
        const definition = this.dictionary[this.currentWord];
        if (!definition) {
            this.elements.definition.textContent = 'Definition not found.';
            return;
        }
        // Split by word boundaries, keeping punctuation attached
        const tokens = definition.split(/(\s+)/);

        this.elements.definition.innerHTML = '';

        tokens.forEach(token => {
            if (/^\s+$/.test(token)) {
                // Whitespace - just add it
                this.elements.definition.appendChild(document.createTextNode(token));
            } else {
                // Extract the word and any punctuation
                const match = token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);

                if (match) {
                    const [, prefix, word, suffix] = match;

                    if (prefix) {
                        this.elements.definition.appendChild(document.createTextNode(prefix));
                    }

                    const wordLower = word.toLowerCase();
                    const span = document.createElement('span');
                    span.textContent = word;
                    span.classList.add('word');

                    // Don't make the word clickable if it's the same as the current word
                    if (wordLower === this.currentWord.toLowerCase()) {
                        span.classList.add('disabled');
                    } else {
                    const wordDefinition = this.dictionary[wordLower];
                    if (wordDefinition && !wordDefinition.toLowerCase().includes('definition not available')) {
                        span.classList.add('clickable');

                        // Highlight if this is the goal word
                        if (wordLower === this.goalWord.toLowerCase()) {
                            span.classList.add('goal-highlight');
                        }

                        span.addEventListener('click', () => this.onWordClick(wordLower));
                    } else {
                        span.classList.add('disabled');
                        }
                    }

                    this.elements.definition.appendChild(span);

                    if (suffix) {
                        this.elements.definition.appendChild(document.createTextNode(suffix));
                    }
                } else {
                    // No word found, just add the token
                    this.elements.definition.appendChild(document.createTextNode(token));
                }
            }
        });
    }

    renderPath() {
        this.elements.path.innerHTML = '';

        this.path.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.classList.add('path-word');
            wordSpan.textContent = word.toUpperCase();

            if (index === 0) {
                wordSpan.classList.add('start');
            }
            if (index === this.path.length - 1) {
                wordSpan.classList.add('current');
            } else {
                // Make all non-current path words clickable
                wordSpan.classList.add('clickable-path');
                wordSpan.style.cursor = 'pointer';
                wordSpan.addEventListener('click', () => this.goBackToPathWord(index));
            }

            this.elements.path.appendChild(wordSpan);

            // Add arrow if not last
            if (index < this.path.length - 1) {
                const arrow = document.createElement('span');
                arrow.classList.add('path-arrow');
                arrow.textContent = '→';
                this.elements.path.appendChild(arrow);
            }
        });
    }

    goBackToPathWord(index) {
        if (this.gameWon) return;
        if (index < 0 || index >= this.path.length) return;
        
        // Truncate path to the clicked word
        this.path = this.path.slice(0, index + 1);
        this.currentWord = this.path[index];
        this.jumpCount = index; // Update jump count to match path position
        
        this.updateUI();
    }

    onWordClick(word) {
        if (this.gameWon) return;
        if (word === this.currentWord) return;

        this.currentWord = word;
        this.jumpCount++;
        this.path.push(word);

        this.updateUI();

        // Check for win
        if (word.toLowerCase() === this.goalWord.toLowerCase()) {
            this.gameWon = true;
            this.showWinModal();
        }
    }

    showWinModal() {
        this.elements.finalJumps.textContent = this.jumpCount;

        // Render final path
        this.elements.finalPath.innerHTML = '';
        this.path.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.classList.add('path-word');
            wordSpan.textContent = word.toUpperCase();
            this.elements.finalPath.appendChild(wordSpan);

            if (index < this.path.length - 1) {
                const arrow = document.createElement('span');
                arrow.classList.add('path-arrow');
                arrow.textContent = '→';
                this.elements.finalPath.appendChild(arrow);
            }
        });

        this.elements.shareFeedback.textContent = '';
        this.elements.winModal.classList.add('active');
    }

    closeWinModal() {
        this.elements.winModal.classList.remove('active');
    }
    
    openSuggestionModal() {
        this.currentPage = 1;
        this.displaySuggestedWords();
        this.elements.suggestionModal.classList.add('active');
    }
    
    closeSuggestionModal() {
        this.elements.suggestionModal.classList.remove('active');
        this.elements.suggestWordInput.value = '';
    }
    
    changePage(direction) {
        this.changePageAsync(direction);
    }
    
    async changePageAsync(direction) {
        const suggestions = await this.getWordSuggestions();
        const totalPages = Math.max(1, Math.ceil(suggestions.length / this.wordsPerPage));
        
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        
        await this.displaySuggestedWords();
    }

    shareResult() {
        const dayNumber = this.getDayNumber();
        const shareText = `Wordridge #${dayNumber}\n${this.startWord.toUpperCase()} → ${this.goalWord.toUpperCase()}\n${this.jumpCount} jump${this.jumpCount !== 1 ? 's' : ''}\n\nhttps://wordridge.game`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.elements.shareFeedback.textContent = 'Copied to clipboard!';
                setTimeout(() => {
                    this.elements.shareFeedback.textContent = '';
                }, 2000);
            }).catch(() => {
                this.fallbackShare(shareText);
            });
        } else {
            this.fallbackShare(shareText);
        }
    }

    fallbackShare(text) {
        // Create a temporary textarea for copying
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            this.elements.shareFeedback.textContent = 'Copied to clipboard!';
        } catch (err) {
            this.elements.shareFeedback.textContent = 'Failed to copy. Please copy manually.';
        }

        document.body.removeChild(textarea);
        setTimeout(() => {
            this.elements.shareFeedback.textContent = '';
        }, 2000);
    }

    // Get all words that appear in a given word's definition
    getNeighbors(word) {
        const definition = this.dictionary[word];
        if (!definition) return [];

        const neighbors = [];
        const wordMatches = definition.match(/\b[a-zA-Z]+\b/g);
        
        if (wordMatches) {
            const seen = new Set();
            for (const match of wordMatches) {
                const wordLower = match.toLowerCase();
                // Only include if it's in the dictionary, not the same word, and not already added
                if (this.dictionary[wordLower] && 
                    wordLower !== word.toLowerCase() && 
                    !seen.has(wordLower) &&
                    !this.dictionary[wordLower].toLowerCase().includes('definition not available')) {
                    neighbors.push(wordLower);
                    seen.add(wordLower);
                }
            }
        }
        
        return neighbors;
    }

    // BFS to find shortest path from start to goal
    findShortestPath(start, goal) {
        const startLower = start.toLowerCase();
        const goalLower = goal.toLowerCase();

        if (startLower === goalLower) {
            return { path: [start], jumps: 0 };
        }

        // Normalize dictionary keys to lowercase for lookup
        const dictKeysLower = new Map();
        for (const word in this.dictionary) {
            dictKeysLower.set(word.toLowerCase(), word);
        }

        // Check if both words exist
        if (!dictKeysLower.has(startLower) || !dictKeysLower.has(goalLower)) {
            return null;
        }

        const queue = [[startLower]];
        const visited = new Set([startLower]);
        const maxDepth = 20; // Prevent infinite loops

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];

            if (path.length > maxDepth) {
                continue; // Skip paths that are too long
            }

            const neighbors = this.getNeighbors(current);

            for (const neighbor of neighbors) {
                if (neighbor === goalLower) {
                    // Found the goal!
                    return { 
                        path: [...path, neighbor].map(w => dictKeysLower.get(w) || w), 
                        jumps: path.length 
                    };
                }

                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([...path, neighbor]);
                }
            }
        }

        return null; // No path found
    }

    renderAnswerPath(path) {
        this.elements.answerPath.innerHTML = '';

        path.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.classList.add('path-word');
            wordSpan.textContent = word.toUpperCase();

            if (index === 0) {
                wordSpan.classList.add('start');
            }
            if (index === path.length - 1) {
                wordSpan.classList.add('goal');
            }

            this.elements.answerPath.appendChild(wordSpan);

            // Add arrow if not last
            if (index < path.length - 1) {
                const arrow = document.createElement('span');
                arrow.classList.add('path-arrow');
                arrow.textContent = '→';
                this.elements.answerPath.appendChild(arrow);
            }
        });
    }
    
    // Check if a word appears in any definition in the dictionary
    isWordInDefinitions(word) {
        const wordLower = word.toLowerCase();
        const wordPattern = new RegExp(`\\b${wordLower}\\b`, 'i');
        
        for (const key in this.dictionary) {
            const definition = this.dictionary[key];
            if (definition && wordPattern.test(definition)) {
                return true;
            }
        }
        return false;
    }
    
    // Submit word suggestion
    async submitWordSuggestion() {
        const word = this.elements.suggestWordInput.value.trim().toLowerCase();
        
        if (!word) {
            return;
        }
        
        // Validate that word contains only letters
        if (!/^[a-z]+$/i.test(word)) {
            return;
        }
        
        // Check if word already exists in dictionary
        if (this.dictionary[word]) {
            this.elements.suggestWordInput.value = '';
            return;
        }
        
        // Check if word appears in any definition
        if (!this.isWordInDefinitions(word)) {
            return;
        }
        
        // Check if word is already suggested
        const suggestions = await this.getWordSuggestions();
        if (suggestions.find(s => s.word === word)) {
            this.elements.suggestWordInput.value = '';
            return;
        }
        
        // Store suggestion
        const success = await this.saveWordSuggestion(word);
        
        if (success) {
            // Update the display
            await this.displaySuggestedWords();
            this.elements.suggestWordInput.value = '';
        }
    }
    
    // Save word suggestion to Firestore or localStorage
    async saveWordSuggestion(word) {
        const timestamp = new Date().toISOString();
        const suggestion = { word, timestamp };
        
        if (this.useFirebase && this.db) {
            try {
                // Save to Firestore
                await this.db.collection('word_suggestions').add(suggestion);
                console.log('Word suggestion saved to Firestore:', word);
                return true;
            } catch (e) {
                console.error('Error saving to Firestore:', e);
                // Fallback to localStorage
                return this.saveToLocalStorage(suggestion);
            }
        } else {
            // Use localStorage
            return this.saveToLocalStorage(suggestion);
        }
    }
    
    // Fallback: Save to localStorage
    saveToLocalStorage(suggestion) {
        try {
            const suggestions = this.getLocalStorageSuggestions();
            suggestions.push(suggestion);
            localStorage.setItem('wordridge_suggestions', JSON.stringify(suggestions));
            console.log('Word suggestion saved to localStorage:', suggestion.word);
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    }
    
    // Get suggestions from localStorage (helper)
    getLocalStorageSuggestions() {
        try {
            const suggestions = localStorage.getItem('wordridge_suggestions');
            return suggestions ? JSON.parse(suggestions) : [];
        } catch (e) {
            console.error('Error reading localStorage:', e);
            return [];
        }
    }
    
    // Get word suggestions from Firestore or localStorage
    async getWordSuggestions() {
        if (this.useFirebase && this.db) {
            try {
                const snapshot = await this.db.collection('word_suggestions')
                    .orderBy('timestamp', 'desc')
                    .get();
                
                const suggestions = [];
                snapshot.forEach(doc => {
                    suggestions.push({ id: doc.id, ...doc.data() });
                });
                
                return suggestions;
            } catch (e) {
                console.error('Error fetching from Firestore:', e);
                // Fallback to localStorage
                return this.getLocalStorageSuggestions();
            }
        } else {
            return this.getLocalStorageSuggestions();
        }
    }
    
    // Display suggested words list with pagination
    async displaySuggestedWords() {
        const suggestions = await this.getWordSuggestions();
        
        if (suggestions.length === 0) {
            this.elements.suggestedWordsList.innerHTML = '<p class="no-suggestions">All suggested words have been added to the dictionary.</p>';
            this.elements.pageInfo.textContent = 'Page 0 of 0';
            this.elements.prevPageBtn.disabled = true;
            this.elements.nextPageBtn.disabled = true;
            return;
        }
        
        // Sort by most recent first (already sorted from Firestore query)
        
        // Calculate pagination
        const totalPages = Math.ceil(suggestions.length / this.wordsPerPage);
        const startIdx = (this.currentPage - 1) * this.wordsPerPage;
        const endIdx = Math.min(startIdx + this.wordsPerPage, suggestions.length);
        const pageWords = suggestions.slice(startIdx, endIdx);
        
        // Split into two columns (10 words each)
        const column1 = pageWords.slice(0, 10);
        const column2 = pageWords.slice(10, 20);
        
        const column1Html = column1.map(s => 
            `<span class="suggested-word-tag">${s.word}</span>`
        ).join('');
        
        const column2Html = column2.map(s => 
            `<span class="suggested-word-tag">${s.word}</span>`
        ).join('');
        
        this.elements.suggestedWordsList.innerHTML = `
            <div class="words-column">${column1Html}</div>
            ${column2.length > 0 ? `<div class="words-column">${column2Html}</div>` : ''}
        `;
        
        // Update pagination controls
        this.elements.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        this.elements.prevPageBtn.disabled = this.currentPage === 1;
        this.elements.nextPageBtn.disabled = this.currentPage === totalPages;
    }
    
    // Remove word from suggestions (call this when a word is added to dictionary)
    async removeWordSuggestion(word) {
        if (this.useFirebase && this.db) {
            try {
                const snapshot = await this.db.collection('word_suggestions')
                    .where('word', '==', word.toLowerCase())
                    .get();
                
                const batch = this.db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                
                console.log(`Removed "${word}" from Firestore`);
                await this.displaySuggestedWords();
            } catch (e) {
                console.error('Error removing from Firestore:', e);
            }
        } else {
            try {
                const suggestions = this.getLocalStorageSuggestions();
                const filtered = suggestions.filter(s => s.word !== word.toLowerCase());
                localStorage.setItem('wordridge_suggestions', JSON.stringify(filtered));
                await this.displaySuggestedWords();
            } catch (e) {
                console.error('Error removing from localStorage:', e);
            }
        }
    }
    
    // Developer functions to manage suggestions
    async exportSuggestionsAsJSON() {
        const suggestions = await this.getWordSuggestions();
        const json = JSON.stringify(suggestions, null, 2);
        console.log('=== WORD SUGGESTIONS JSON ===');
        console.log(json);
        console.log('=== END ===');
        return json;
    }
    
    async exportSuggestionsAsText() {
        const suggestions = await this.getWordSuggestions();
        const text = suggestions.map(s => s.word).join('\n');
        console.log('=== WORD SUGGESTIONS LIST ===');
        console.log(text);
        console.log(`Total: ${suggestions.length} words`);
        console.log('=== END ===');
        return text;
    }
    
    async downloadSuggestionsAsFile(format = 'json') {
        const suggestions = await this.getWordSuggestions();
        let content, filename, mimeType;
        
        if (format === 'json') {
            content = JSON.stringify(suggestions, null, 2);
            filename = `wordridge-suggestions-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
        } else {
            content = suggestions.map(s => `${s.word}\t${s.timestamp}`).join('\n');
            filename = `wordridge-suggestions-${new Date().toISOString().split('T')[0]}.txt`;
            mimeType = 'text/plain';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Downloaded: ${filename}`);
    }
    
    async clearAllSuggestions() {
        if (!confirm('Are you sure you want to clear ALL word suggestions? This cannot be undone!')) {
            return;
        }
        
        if (this.useFirebase && this.db) {
            try {
                const snapshot = await this.db.collection('word_suggestions').get();
                const batch = this.db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log('All suggestions cleared from Firestore.');
            } catch (e) {
                console.error('Error clearing Firestore:', e);
            }
        }
        
        // Also clear localStorage
        localStorage.removeItem('wordridge_suggestions');
        await this.displaySuggestedWords();
        console.log('All suggestions cleared.');
    }
    
    // Batch remove words that are now in dictionary
    async cleanupSuggestions() {
        const suggestions = await this.getWordSuggestions();
        const beforeCount = suggestions.length;
        let removedCount = 0;
        
        if (this.useFirebase && this.db) {
            try {
                const batch = this.db.batch();
                for (const suggestion of suggestions) {
                    if (this.dictionary[suggestion.word]) {
                        const docRef = this.db.collection('word_suggestions').doc(suggestion.id);
                        batch.delete(docRef);
                        removedCount++;
                    }
                }
                await batch.commit();
            } catch (e) {
                console.error('Error cleaning Firestore:', e);
            }
        } else {
            const filtered = suggestions.filter(s => !this.dictionary[s.word]);
            localStorage.setItem('wordridge_suggestions', JSON.stringify(filtered));
            removedCount = beforeCount - filtered.length;
        }
        
        await this.displaySuggestedWords();
        console.log(`Removed ${removedCount} words that are now in the dictionary.`);
        return removedCount;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const game = new Wordridge();
    await game.init();
    
    // Expose game instance globally for dev access
    window.wordridgeGame = game;
    
    // Log developer commands
    console.log('%c🎮 Wordridge Developer Mode', 'color: #4a9eff; font-size: 16px; font-weight: bold;');
    console.log('%cAvailable commands:', 'color: #666; font-size: 12px;');
    console.log('%c  wordridgeGame.exportSuggestionsAsJSON()', 'color: #888;');
    console.log('%c  wordridgeGame.exportSuggestionsAsText()', 'color: #888;');
    console.log('%c  wordridgeGame.downloadSuggestionsAsFile("json") or ("txt")', 'color: #888;');
    console.log('%c  wordridgeGame.cleanupSuggestions()', 'color: #888;');
    console.log('%c  wordridgeGame.clearAllSuggestions()', 'color: #888;');
    console.log('%c  wordridgeGame.removeWordSuggestion("word")', 'color: #888;');
});
