# Slack Notification Sound App

A React Native/Expo app that plays Slack notification sounds at random intervals, even when the app is closed or the screen is locked.

## Features

- 🔊 Plays custom Slack notification sounds at random intervals
- ⏱️ Adjustable interval range (1 second to 30 minutes)
- 🎛️ Interactive sliders for min/max interval settings
- 🔔 Works in background - notifications continue when app is closed
- ▶️ Start/Stop toggle

## Quick Start

### Development Build (Required)

This app uses native modules that require a development build (not Expo Go).

```bash
npm install
npx expo run:android  # For Android
npx expo run:ios      # For iOS (Mac only)
```

See [DEVELOPMENT_BUILD.md](./DEVELOPMENT_BUILD.md) for detailed setup instructions.

### Building Standalone Release

For a production build that runs independently:

```bash
# Using EAS (cloud build)
npm install -g eas-cli
eas login
eas build --profile production --platform android

# Or build locally
npx expo export --platform android
cd android && ./gradlew assembleRelease
```

See [BUILD_RELEASE.md](./BUILD_RELEASE.md) for details.

## Important: Android Setup

For notifications to work when the app is closed:

1. **Grant notification permissions** when prompted
2. **Disable battery optimization:**
   - Settings → Apps → app-that-makes-slack-notification-sound
   - Battery → Battery Optimization → Select "Not optimized"

The app will prompt you to open these settings on first launch.

## Sound File

The app uses `assets/slack_notification.mp3`. Replace this file with your own MP3 if needed.

## Technologies

- React Native / Expo
- TypeScript
- expo-notifications (background notifications)
- expo-task-manager (background tasks)
