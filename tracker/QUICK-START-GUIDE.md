# 🚀 SPINIT MVP - QUICK START GUIDE

## Immediate Next Steps

### 1. Firebase Questions (Please Provide)
Before we start building, I need:

**Firebase Project:**
- [ ] Project ID: `_____________`
- [ ] API Key: `_____________`
- [ ] Auth Domain: `_____________`
- [ ] Storage Bucket: `_____________`
- [ ] Messaging Sender ID: `_____________`
- [ ] App ID: `_____________`

**Firebase Setup:**
- [ ] Is Firestore Database created? (Region: asia-south1 recommended)
- [ ] Is Phone Authentication enabled?
- [ ] Do you have test phone numbers set up?

**Vendor Data:**
- [ ] Vendor name: `_____________`
- [ ] Vendor phone: `_____________`
- [ ] Vendor address: `_____________`

---

## Step-by-Step Setup

### Step 1: Initialize Expo Project
```bash
npx create-expo-app spinit --template blank-typescript
cd spinit
```

### Step 2: Install Dependencies
```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler

# Firebase
npm install firebase

# State
npm install zustand

# Location
npm install expo-location

# Date Picker
npm install react-native-date-picker

# Styling (NativeWind)
npm install nativewind
npm install --save-dev tailwindcss
```

### Step 3: Setup NativeWind
Create `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#EC4899',
        primaryLight: '#F9A8D4',
        primaryDark: '#DB2777',
      },
    },
  },
  plugins: [],
}
```

Update `babel.config.js`:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

Update `App.tsx`:
```typescript
import './global.css';
// ... rest of app
```

Create `global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 4: Create Folder Structure
```bash
mkdir -p src/screens/Auth src/screens/Main
mkdir -p src/navigation src/store src/services
mkdir -p src/components src/utils src/assets/illustrations
```

### Step 5: Download Illustrations
1. Go to https://undraw.co
2. Search for illustrations:
   - "relaxing" or "weekend" (for onboarding screen 1)
   - "delivery" or "fast" (for onboarding screen 2)
   - "eco friendly" or "sustainability" (for onboarding screen 3)
3. Download SVG files
4. Save to `src/assets/illustrations/`
5. Use `react-native-svg` to render or convert to PNG

---

## Color Reference (Pink Theme)

```typescript
// Primary Pink
primary: '#EC4899'        // Main actions, buttons
primaryLight: '#F9A8D4'   // Hover states, light backgrounds
primaryDark: '#DB2777'    // Pressed states, dark accents

// Usage Examples
className="bg-primary text-white"           // Pink button
className="text-primary"                     // Pink text
className="border-primary"                   // Pink border
```

---

## Component Patterns

### Button (Pink Primary)
```typescript
<TouchableOpacity 
  className="bg-primary py-4 px-6 rounded-lg"
  onPress={handlePress}
>
  <Text className="text-white text-center font-semibold">
    Continue
  </Text>
</TouchableOpacity>
```

### Input
```typescript
<TextInput
  className="border border-gray-300 rounded-lg px-4 py-3"
  placeholder="Enter your name"
  value={value}
  onChangeText={setValue}
/>
```

### Card
```typescript
<View className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
  {/* Card content */}
</View>
```

---

## Firebase Setup Checklist

### 1. Create Firestore Collections
```
/vendors/vendor_1/
  {
    "name": "Your Vendor Name",
    "phone": "+91XXXXXXXXXX",
    "address": "Your Address",
    "active": true
  }

/vendors/vendor_1/services/
  - wash_fold
  - wash_iron
  - shoe_clean
  - bag_clean
  - dry_clean
```

### 2. Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /addresses/{addressId} {
        allow read, write: if request.auth.uid == userId;
      }
      match /orders/{orderId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    match /vendors/{vendorId} {
      allow read: if true;
      match /services/{serviceId} {
        allow read: if true;
      }
    }
  }
}
```

---

## Implementation Order

1. **Setup** → Project + Dependencies + NativeWind
2. **Firebase** → Config + Firestore structure
3. **Stores** → authStore, addressStore, orderStore
4. **Auth Flow** → Onboarding → Login → OTP → Location
5. **Main Flow** → Home → Service → Address → Pickup → Review → Confirm
6. **Tracking** → My Orders → Order Detail
7. **Navigation** → Connect all screens
8. **Testing** → Real device testing

---

## Common Issues & Solutions

### NativeWind not working?
- Check `babel.config.js` has `nativewind/babel` plugin
- Check `global.css` is imported in `App.tsx`
- Restart Metro bundler

### Firebase connection issues?
- Check API keys are correct
- Verify Firestore is enabled
- Check security rules

### Navigation errors?
- Ensure all screens are registered
- Check stack/tab navigator setup
- Verify route names match

---

**Once you provide Firebase details, we can start building!** 🚀

