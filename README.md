# Wordridge

A word-navigation puzzle game inspired by Wordle. Navigate through word definitions to reach the goal word.

## How to Play

1. You start with a word and its definition
2. Click on any highlighted word in the definition to jump to that word
3. Keep jumping until you reach the goal word
4. Try to reach the goal in as few jumps as possible!

## Running the Game

The game loads the dictionary from `dictionary.json`, so you'll need to run a local web server to avoid CORS restrictions.

### Option 1: Using Python (Recommended)

If you have Python installed:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open `http://localhost:8000` in your browser.

### Option 2: Using Node.js

If you have Node.js installed:

```bash
npx serve
```

Then open the URL shown in the terminal (usually `http://localhost:3000`).

### Option 3: Using VS Code

If you're using VS Code, install the "Live Server" extension and right-click `index.html` → "Open with Live Server".

## Dictionary

The game includes a comprehensive dictionary of **435,663 words** stored in `dictionary.json` (27 MB). The dictionary uses a simple format:

```json
{
  "word": "definition text here"
}
```

Words in definitions that exist in the dictionary become clickable links.

### Dictionary Sources

The dictionary was compiled from multiple open-source sources:

1. **Webster's Unabridged Dictionary** (~86,000 words)
   - Source: [adambom/dictionary](https://github.com/adambom/dictionary)
   - License: MIT
   - Based on the 1913 Webster's Unabridged Dictionary (public domain)

2. **ssvivian/WebstersDictionary** (~8,000 additional words)
   - Source: [ssvivian/WebstersDictionary](https://github.com/ssvivian/WebstersDictionary)
   - Webster's from Project Gutenberg with NLP enhancements

3. **Wordset Dictionary** (~53,000 additional words)
   - Source: [wordset/wordset-dictionary](https://github.com/wordset/wordset-dictionary)
   - Human-friendly definitions with 177k meanings and 63,936 manual edits
   - Built upon Princeton WordNet with extensive modifications

4. **dwyl/english-words** (~259,000 additional words)
   - Source: [dwyl/english-words](https://github.com/dwyl/english-words)
   - 479k English word list for comprehensive coverage
   - Words without definitions are marked as "Definition not available"

5. **simple-english-dictionary** (~29,000 words)
   - Source: [nightblade9/simple-english-dictionary](https://github.com/nightblade9/simple-english-dictionary)
   - Simple English dictionary with basic definitions

### Acknowledgments

This project uses dictionary data from various open-source projects. Special thanks to:
- Project Gutenberg for the public domain Webster's dictionary
- Princeton University for WordNet
- All contributors to the open-source dictionary projects listed above

## Features

- Daily challenge (same puzzle for everyone each day)
- Unlimited practice mode via "New Game" button
- Share your results
- Path tracking to see your journey
- **Word suggestion system**: Help improve the dictionary by suggesting missing words

## Contributing Missing Words

If you encounter words that appear grayed-out in definitions (meaning they exist in definitions but not in the dictionary), you can suggest them:

1. Click the "Missing A Word?" button at the bottom of the page
2. Enter the word you'd like to suggest
3. The system validates that:
   - The word appears in at least one definition
   - The word is not already in the dictionary
   - The word hasn't been suggested before
4. Your suggestion is stored in Firebase Firestore and is visible to all users

**Note:** Word suggestions are stored in Firebase Firestore for universal access. If Firebase is not configured, the system falls back to localStorage (browser-only storage).

### For Developers

- **Setup Firebase**: See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for complete setup instructions
- **Managing Suggestions**: Use browser console commands to export, download, and manage word suggestions
- **Adding Words**: After reviewing suggestions, add them to `dictionary.json` and run the cleanup command

Firebase provides a free tier that's more than sufficient for this use case (50k reads + 20k writes per day).
