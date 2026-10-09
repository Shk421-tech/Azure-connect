# Linking two phones (about 10 minutes, free)

The app works on one phone out of the box (demo mode: Settings → "Demo: switch sides" shows both views).
To make it work between two real phones, it needs a small cloud backend. This uses Firebase's free tier.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com and sign in.
2. **Add project** → any name (e.g. "azure-connect"). Google Analytics can be off.
3. In the project, **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
4. **Build → Firestore Database → Create database** → production mode → pick a region near you.
5. **Firestore → Rules**, replace everything with the rules below and **Publish**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only someone who knows the space code can reach its items. There is no way to list spaces.
    match /pairs/{code} {
      allow get, create: if request.auth != null;
      allow list: if false;
      match /items/{item} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## 2. Get the web config
1. **Project settings (gear) → General → Your apps → Add app → Web (`</>`)**. Name it, skip hosting.
2. Copy the `firebaseConfig` values it shows.
3. Open `app/src/main/assets/www/firebase-config.js` and replace the file contents with:

```js
window.FIREBASE_CONFIG = {
  apiKey: "…", authDomain: "…", projectId: "…", appId: "…"
};
```

## 3. Install on both phones
Build and run the app on Piyu's phone and on the friend's phone (Android Studio → Run, or Build → Build APK(s) and send the APK).

## 4. Pair them
1. On Piyu's phone choose **I'm Piyu**. Tap **Create it**. An 8-letter code appears. Tap **Share code**.
2. On the friend's phone choose **I'm Piyu's friend**, type the code, tap **Connect**.

From then on:
- The friend's home screen is a "send a surprise" screen (message, photo, song link or voice note). It sits on Piyu's home screen for 24 hours.
- Piyu's I NEED YOU button, shared diary entries and memories show up on the friend's phone. Private entries never leave Piyu's phone.
- Memories are shared by both.

## What travels, and what doesn't
- **Photos and voice notes** travel (photos are shrunk automatically; voice notes are capped at 45 seconds).
- **Songs** travel as a **link** (Spotify, YouTube, Apple Music). Audio files you pick from the phone play on that phone only, because music files are too big to sync for free.
- Entries are only sent when Piyu chooses "Share". Sharing again later or switching back to private deletes the sent copy.

## Notifications: the honest part
Right now the app notifies the other person when it is open, or recently open in the background. For notifications that arrive
when the app is fully closed, you need push messaging: add a Firebase **Cloud Function** that sends an FCM message when a new
document appears under `pairs/{code}/items` (this needs the Blaze pay-as-you-go plan, which for two people costs essentially nothing).
That is a natural next step once the basic pairing is working.

## Security note
Anyone who learns the 8-letter code could read and write that space, so treat it like a password and share it only with the one friend.
