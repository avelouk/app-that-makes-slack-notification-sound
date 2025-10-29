# Building a Standalone Release

This guide shows you how to create a standalone release build that runs without the development server.

## Option 1: EAS Build (Cloud) - Recommended

Easiest method, no local setup required.

### Prerequisites:
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```
   (Create account at https://expo.dev if needed - it's free)

### Build Steps:

#### For Android APK:
```bash
eas build --profile production --platform android
```

This will:
- Build your app in the cloud
- Create a standalone APK file
- Take 10-20 minutes
- Email you when done with download link

#### For iOS:
```bash
eas build --profile production --platform ios
```
(Requires Apple Developer account for physical devices)

### After Build Completes:
1. Download the APK from Expo dashboard or email
2. Install on your Android device:
   ```bash
   adb install path/to/app.apk
   ```
   Or transfer the APK file to your phone and install manually

3. The app will run completely standalone - no server needed!

---

## Option 2: Local Build with Gradle

Build locally using Android Studio (faster but requires setup).

### Prerequisites:
- Android Studio installed ✓ (you already have this)
- Device connected or emulator running

### Build Steps:

1. **Export the JavaScript bundle:**
   ```bash
   npx expo export --platform android
   ```

2. **Build the release APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Find your APK:**
   The APK will be at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

4. **Install on your device:**
   ```bash
   # From project root
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

   Or manually transfer the APK file to your phone and install.

---

## Quick Reference

### EAS Build (Cloud):
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build Android release
eas build --profile production --platform android

# Build iOS release (requires Apple Developer account)
eas build --profile production --platform ios
```

### Local Build:
```bash
# Export JS bundle
npx expo export --platform android

# Build APK
cd android && ./gradlew assembleRelease

# Install
adb install app/build/outputs/apk/release/app-release.apk
```

---

## Important Notes:

1. **Standalone builds include everything:**
   - All JavaScript bundled
   - All assets included
   - No development server needed
   - Works offline

2. **After installing the release build:**
   - App works completely independently
   - No need to run `npm start` or `expo start`
   - Can be uninstalled/reinstalled like any app

3. **For distribution:**
   - APK files can be shared and installed on any Android device
   - For Google Play Store, you'd need to build an AAB (Android App Bundle) instead:
     ```bash
     eas build --profile production --platform android --type app-bundle
     ```

---

## Troubleshooting:

- **Build fails**: Check that all dependencies are installed and app.json is valid
- **APK too large**: This is normal for React Native apps, can be optimized later
- **Installation fails**: Make sure "Install from Unknown Sources" is enabled in Android settings

