# Spinit - Modern Laundry & dry-clean platform

Spinit is a premium, cross-platform mobile application built with **Expo SDK 54** designed to streamline laundry and dry-cleaning services. It features a high-performance architecture, rich micro-animations, and a seamless user experience.

---

## 🚀 Tech Stack

- **Core**: [Expo SDK 54](https://expo.dev/) & [React Native 0.81](https://reactnative.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Styling**: [NativeWind (Tailwind CSS)](https://www.nativewind.dev/)
- **Backend / Auth**: [React Native Firebase](https://rnfirebase.io/) (App, Auth, Firestore)
- **Navigation**: [React Navigation 7](https://reactnavigation.org/)
- **Animations**: [Lottie React Native](https://github.com/lottie-react-native/lottie-react-native) & [React Native Reanimated 4](https://docs.swmansion.com/react-native-reanimated/)
- **Native Modules**: Location, MapWorks, Webview, and Image Picker.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or later)
- macOS (for iOS builds)
- CocoaPods (for iOS local development)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)

### Installation

```bash
# Install dependencies
npm install

# Install iOS pods
npx expo prebuild --platform ios --clean
```

---

## 📱 Development & Building

### Local Development

```bash
# Start Metro Bundler (Recommended: use --clear to purge cache)
npx expo start --clear

# Run on iOS Developer Client (Physical Device)
npx expo run:ios --device

# Run on iOS Simulator
npx expo run:ios

# Run on Android Emulator/Device
npx expo run:android

# Run Web Dashboard
npx expo start --web
```

### 📦 EAS Builds (Cloud)

#### Android
```bash
# Build Android Preview APK (for testing)
npx eas-cli build --platform android --profile preview --clear-cache

# Build Android Production Build
npx eas-cli build --platform android --profile production
```

#### iOS
```bash
# Build iOS Development Client
npx eas-cli build --platform ios --profile development

# Build iOS Distribution
npx eas-cli build --platform ios --profile production
```

---

## 🧹 Maintenance & Troubleshooting

#### Deep Clean (Reset Native Projects)
If you encounter weird native compilation errors, running a deep clean is recommended:
```bash
rm -rf ios android node_modules
npm install
npx expo prebuild --clean
```

#### Sync Native Dependencies
```bash
# Ensure all packages match the Expo SDK 54 versions
npx expo install --check
npx expo install --fix
```

---

## 🏗️ Architecture

- `src/screens`: UI Pages organized by flow (Auth, Main, Service selection).
- `src/components`: Reusable UI elements (Buttons, Headers, Modals).
- `src/services`: API interactions and Firebase Logic.
- `src/store`: Global state stores powered by Zustand.
- `src/navigation`: Stack and Tab navigation configuration.
- `plugins/`: Custom Expo config plugins for Firebase and native tweaks.

---

## 🔐 Configuration

The project uses:
- `app.json`: Central Expo configuration.
- `GoogleService-Info.plist`: iOS Firebase configuration.
- `google-services.json`: Android Firebase configuration.
- `newArchEnabled: true`: Project is configured to use the **New Architecture**.

---

## 📄 License

Private Project - All rights reserved.
