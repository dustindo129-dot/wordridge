# Firebase Setup Guide for Wordridge

This guide will walk you through setting up Firebase Firestore to store word suggestions universally across all users.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "Wordridge" or "wordridge-game")
4. (Optional) Disable Google Analytics if you don't need it
5. Click **"Create project"**

## Step 2: Register Your Web App

1. In your Firebase project dashboard, click the **Web icon** (`</>`) to add a web app
2. Enter an app nickname (e.g., "Wordridge Web App")
3. **Do NOT** check "Also set up Firebase Hosting" (unless you want to host on Firebase)
4. Click **"Register app"**
5. You'll see a configuration object - **keep this page open**, you'll need it in Step 4

## Step 3: Enable Firestore Database

1. In the left sidebar, click **"Firestore Database"** (under "Build")
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll configure rules next)
4. Select a Cloud Firestore location (choose one close to your users)
5. Click **"Enable"**

## Step 4: Configure Security Rules

1. In Firestore, go to the **"Rules"** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Word suggestions collection
    match /word_suggestions/{document} {
      // Allow anyone to read suggestions
      allow read: if true;
      
      // Allow anyone to create suggestions
      // Validate that the document has required fields and proper format
      allow create: if request.resource.data.keys().hasAll(['word', 'timestamp'])
                    && request.resource.data.word is string
                    && request.resource.data.word.matches('^[a-z]+$')
                    && request.resource.data.timestamp is string;
      
      // Only allow you (the admin) to delete suggestions
      // For now, we'll allow anyone - you can restrict this later with authentication
      allow delete: if true;
      
      // Don't allow updates (suggestions are immutable once created)
      allow update: if false;
    }
  }
}
```

3. Click **"Publish"**

**Security Notes:**
- These rules allow anyone to read and create suggestions
- Suggestions cannot be modified (only created or deleted)
- The `word` field must be lowercase letters only
- For production, you might want to add rate limiting or authentication

## Step 5: Add Firebase Credentials to Your App

1. Go back to **Project Settings** (gear icon in sidebar)
2. Scroll down to **"Your apps"** section
3. You'll see your Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

4. Open `firebase-config.js` in your Wordridge project
5. Replace the placeholder values with your actual credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-actual-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-actual-project.appspot.com",
    messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
    appId: "YOUR_ACTUAL_APP_ID"
};
```

## Step 6: Test Your Setup

1. Start your local server (e.g., `python -m http.server 8000`)
2. Open your browser to `http://localhost:8000`
3. Open the browser console (F12)
4. You should see: `✓ Firebase initialized successfully`
5. Click **"Missing A Word?"** button
6. Try suggesting a word that appears grayed-out in a definition
7. Check the Firestore console to verify the suggestion was saved

### Testing in Firestore Console

1. Go to Firestore Database in Firebase Console
2. You should see a `word_suggestions` collection
3. Click on it to see all submitted suggestions
4. Each suggestion should have:
   - `word`: the suggested word (string)
   - `timestamp`: when it was submitted (string)

## Step 7: Managing Suggestions (Developer Tools)

Open the browser console (F12) and use these commands:

```javascript
// View all suggestions in console
await wordridgeGame.exportSuggestionsAsJSON()

// Download suggestions as a file
await wordridgeGame.downloadSuggestionsAsFile('json')

// Remove a specific word (after adding it to dictionary)
await wordridgeGame.removeWordSuggestion('example')

// Clean up all words that are now in dictionary
await wordridgeGame.cleanupSuggestions()

// View raw Firestore data
await wordridgeGame.getWordSuggestions()
```

## Step 8: Viewing Suggestions in Firebase Console

1. Go to Firestore Database in Firebase Console
2. Click on `word_suggestions` collection
3. You'll see all suggestions with their timestamps
4. You can:
   - Export data as JSON
   - Delete individual suggestions
   - View usage statistics

## Troubleshooting

### "Firebase not initialized" error
- Check that `firebase-config.js` is loaded before `app.js` in `index.html`
- Verify your Firebase credentials are correct
- Check browser console for detailed error messages

### "Permission denied" errors
- Verify Firestore security rules are published
- Check that rules allow reading and creating documents

### Suggestions not appearing
- Open browser console and check for errors
- Verify Firebase is initialized: `console.log(window.firebaseConfig)`
- Check Firestore console to see if documents are being created

### Fallback to localStorage
If Firebase fails to initialize, the app automatically falls back to localStorage (per-user storage). Check console for warnings.

## Production Deployment

When deploying to production:

1. **Add your production domain** to Firebase:
   - Go to Firebase Console > Authentication > Settings
   - Under "Authorized domains", add your production domain

2. **Consider adding rate limiting** to prevent abuse:
   - Use Firebase Security Rules with timestamps
   - Implement CAPTCHA for suggestion submissions

3. **Set up Firebase Hosting** (optional):
   - Run `firebase init` in your project directory
   - Choose "Hosting" and follow prompts
   - Deploy with `firebase deploy`

4. **Monitor usage**:
   - Check Firebase Console > Usage tab
   - Free tier includes 50k reads + 20k writes per day
   - Set up budget alerts if needed

## Cost Estimate

With Firebase's free tier (Spark plan):
- **50,000 document reads/day** - each user loading suggestions = 1 read
- **20,000 document writes/day** - each suggestion submission = 1 write
- **1 GB storage** - plenty for millions of word suggestions

For a small to medium-sized game, this should be **completely free**. If you need more, the Blaze (pay-as-you-go) plan is very affordable:
- $0.06 per 100k reads
- $0.18 per 100k writes

## Next Steps

After setup is complete:
1. Test suggestion submission from multiple browsers/devices
2. Set up a routine to export suggestions weekly
3. Review suggestions and add valid words to `dictionary.json`
4. Run `cleanupSuggestions()` to remove words that are now in dictionary

---

**Need help?** Check the [Firebase Firestore documentation](https://firebase.google.com/docs/firestore) or open an issue on the Wordridge repository.

