# Running a Development Build

Since this app uses native modules (notifications, background tasks), you need a **development build** instead of Expo Go. Here's how to set it up:

## Prerequisites

1. **Install EAS CLI globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to your Expo account:**
   ```bash
   eas login
   ```
   (Create a free account at https://expo.dev if you don't have one)

## Option 1: Build Locally (Fastest for Testing)

### For iOS Simulator:
```bash
# Install iOS build tools (one-time setup)
npx expo install expo-dev-client
npx expo run:ios
```

### For Android Emulator/Device:
```bash
# Install Android build tools (one-time setup)
npx expo install expo-dev-client
npx expo run:android
```

**Note:** First-time setup requires:
- **iOS**: Xcode installed (Mac only)
- **Android**: Android Studio with Android SDK installed

## Option 2: Build with EAS (Cloud Build)

### For iOS Simulator:
```bash
eas build --profile development --platform ios
```
After build completes, download and install the `.tar.gz` file, then:
```bash
expo start --dev-client
```

### For Android:
```bash
eas build --profile development --platform android
```
After build completes, download and install the `.apk` file on your device, then:
```bash
expo start --dev-client
```

### For Physical Device:
```bash
# iOS (requires Apple Developer account)
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

## Running After Build

Once the development build is installed on your device/simulator:

1. **Start the development server:**
   ```bash
   npm start
   ```
   or
   ```bash
   expo start --dev-client
   ```

2. **Open the development build app** on your device/simulator

3. **Scan the QR code** or press the appropriate key:
   - `i` for iOS simulator
   - `a` for Android emulator

## Quick Commands Reference

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS simulator (locally)
npx expo run:ios

# Build for Android emulator (locally)
npx expo run:android

# Build with EAS (cloud)
eas build --profile development --platform ios
eas build --profile development --platform android

# Start dev server
npm start
# or
expo start --dev-client
```

## Troubleshooting

- **"expo-dev-client not found"**: Run `npx expo install expo-dev-client`
- **Build fails**: Check that you have Xcode (iOS) or Android Studio (Android) properly installed
- **Notifications not working**: Make sure you granted notification permissions in device settings
- **Background not working**: Check that battery optimization is disabled for the app on Android

