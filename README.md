# Slack Notification Sound App

A React Native/Expo app that plays Slack notification sounds at random intervals.

## Features

- 🔊 Plays Slack notification sounds from local assets
- ⏱️ Adjustable interval range (1 second to 30 minutes)
- 🎛️ Interactive sliders for min/max interval settings
- ⏳ Live countdown showing time until next sound
- ▶️ Start/Stop toggle
- 🧪 Test sound button

## Quick Start

### Installation

```bash
npm install
```

### Running the App

```bash
npm start
```

Then use Expo Go app on your phone to scan the QR code, or press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web

## Sound File

The app uses `assets/slack_notification.mp3`. Place your own MP3 file in the `assets` folder and update the import in `App.tsx` if needed.

## Technologies

- React Native / Expo
- TypeScript
- expo-av
- @react-native-community/slider
