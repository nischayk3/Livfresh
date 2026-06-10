# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spinit is a premium, cross-platform laundry & dry-cleaning mobile application built with Expo SDK 54 and React Native 0.81. The app features a modern architecture with Zustand for state management, Firebase for backend services, and NativeWind for styling.

## Common Development Commands

### Development & Building
```bash
# Start Metro bundler (use --clear to purge cache)
npx expo start --clear

# Run on platforms
npx expo run:ios --device      # Physical iOS device
npx expo run:ios              # iOS Simulator
npx expo run:android          # Android Emulator/Device
npx expo start --web          # Web Dashboard

# EAS Builds (Cloud)
npx eas-cli build --platform android --profile preview --clear-cache
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile development
npx eas-cli build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production --latest
```

### Maintenance
```bash
# Deep clean (reset native projects)
rm -rf ios android node_modules
npm install
npx expo prebuild --clean

# Sync native dependencies
npx expo install --check
npx expo install --fix

# Update branch
npx eas update --branch production --message "Update description"
```

## Architecture Overview

### Core Structure
- **src/screens/**: UI pages organized by flow (Auth, Main, Admin)
- **src/components/**: Reusable UI elements (Buttons, Headers, Modals)
- **src/services/**: API interactions and Firebase logic
- **src/store/**: Global state management using Zustand
- **src/navigation/**: Stack and Tab navigation configuration
- **plugins/**: Custom Expo config plugins for Firebase and native tweaks

### State Management (Zustand)
Key stores:
- `authStore`: User authentication and session management
- `orderStore`: Order creation and management
- `cartStore`: Shopping cart functionality
- `addressStore`: User addresses and location management
- `subscriptionStore`: Subscription and credits management
- `adminStore`: Admin dashboard and analytics

### Navigation Architecture
The app uses a hybrid navigation setup:
- **RootNavigator**: Handles authentication flow and route guards
- **MainStack**: Contains the main app flow with tab navigation
- **AdminNavigator**: Separate admin panel with its own navigation

Key features:
- Lazy loading for web compatibility
- Automatic cart hydration on login
- Session expiration handling (12 hours)
- Deep linking support with custom scheme

### Firebase Integration
- **Authentication**: Phone-based auth with OTP
- **Firestore**: Collections for users, orders, vendors, addresses
- **Storage**: Image uploads for garments and attachments
- **Analytics**: Firebase Analytics with Sentry integration

### Styling System
Uses NativeWind (Tailwind CSS) with custom color palette:
- Primary: `#EC4899` (Pink)
- Background: White/light gray
- Text: Dark gray with proper contrast

## Key Implementation Notes

### Authentication Flow
1. Phone login with OTP verification
2. User profile completion (if needed)
3. Location permission and address setup
4. Automatic session management with expiration

### Order Management
- Cart persists across sessions
- Guest cart merges with user cart on login
- Real-time order status updates
- Support for subscription-based services

### Admin Panel
- Role-based access control
- Real-time order management
- Revenue analytics dashboard
- Vendor management capabilities

### Platform-Specific Considerations
- Web uses lazy loading for performance
- iOS and Android have specific permission handling
- New Architecture enabled for better performance
- Custom plugins for Firebase modular SDK

## Configuration Files
- `app.json`: Central Expo configuration with Firebase settings
- `eas.json`: EAS build configuration for distribution
- `tsconfig.json`: TypeScript strict mode enabled
- `tailwind.config.js`: Custom color palette and theme