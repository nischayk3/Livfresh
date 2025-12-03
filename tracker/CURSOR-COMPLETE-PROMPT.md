# SPINIT MVP - COMPLETE CURSOR PROMPT (ALL-IN-ONE)

You are an **expert Expo React Native developer**. I'm building Spinit, an on-demand laundry service MVP for India (similar to local laundry booking apps like UClean/Wassup, NOT a complex marketplace like Blinkit).

## 🎯 PROJECT OVERVIEW

**What:** Mobile app + web admin dashboard for booking laundry services
**Timeline:** 8-10 weeks, single developer, production-ready
**Tech:** Expo + React Native + Firebase + Zustand
**Scope:** Single vendor booking app (NOT multi-vendor marketplace, NOT geolocation)
**User Flow:** Login → Browse Services → Select Options → Add Address → Pick Date/Time → Place Order → Track Status

---

## 📊 COMPLETE USER FLOW (From Figma Analysis)

### Screen 1: OnboardingCarousel
**Purpose:** Show value proposition
- 2 horizontal scrollable slides
  - Slide 1: "Your Weekend is to Live" + washing machine illustration
  - Slide 2: "Fast, Affordable, Hygienic" + delivery illustration  
- Dots indicator showing current slide (3 dots: 2 active/filled, 1 inactive/gray)
- "NEXT" button goes to next slide, then navigates to WelcomeBackScreen on last slide
- "Skip" link navigates directly to WelcomeBackScreen
- Smooth animations, no harsh transitions

**Code Requirements:**
- Use FlatList with horizontal scrolling
- Track currentSlide in state
- Implement calculateViewableItemsChanged for dots
- Use React Native Paper Button for styling
- Export as src/screens/Auth/OnboardingCarousel.tsx

### Screen 2: WelcomeBackScreen  
**Purpose:** Collect user information after phone authentication
- Heading: "Welcome Back!"
- Subheading: "Please enter your details to continue"
- Input Fields:
  - Full Name (with person icon, placeholder "Enter your name", required, min 2 chars)
  - Phone Number (with +91 prefix, auto-formatted to accept 10 digits only, placeholder "Enter phone number")
  - Checkbox: "I agree to the Terms & Conditions and Privacy Policy" (link Terms & Conditions in blue)
- "Continue" button (disabled until all fields valid + checkbox checked)
- On submit: Call Firebase signInWithPhoneNumber(formattedPhone), show loading spinner, navigate to OTPScreen if successful
- Show error toast if sign-in fails

**Validation Logic:**
- Name: required, length >= 2
- Phone: exactly 10 digits (strip non-numeric)
- Checkbox: must be checked
- Button state: enabled only when all validations pass

**Code Requirements:**
- Use React Native Paper TextInput, Checkbox, Button
- Implement form state management
- Phone formatting: remove non-numeric, enforce 10 digits max
- Error toast on sign-in failure
- Export as src/screens/Auth/WelcomeBackScreen.tsx

### Screen 3: OTPScreen
**Purpose:** Verify phone number with OTP
- Display: "Verify OTP"
- Subtext: "Enter the 4-digit code sent to +91 [LAST 4 DIGITS]"
- 4 separate input boxes arranged horizontally (each box accepts 1 digit only)
  - Auto-focus to next box when digit entered
  - Show cursor in unfilled boxes
  - Backspace clears current box and focuses previous
- Below inputs: "Resend code in 28s" (countdown from 30)
  - When countdown reaches 0: enable "Resend" button
  - Click "Resend": call signInWithPhoneNumber again, restart countdown
  - Allow max 3 resend attempts
- Error handling:
  - Invalid OTP: show red error message "Invalid OTP. Please try again."
  - Multiple failed attempts: show "Contact Support" link after 3 failures
  - Maximum 3 attempts before disabling inputs
- Show loading spinner during verification
- On correct OTP:
  - Call firebase.auth().currentUser?.reload()
  - Save user to Firestore: /users/{userId}/ with { phone, name, createdAt: timestamp }
  - Navigate to LocationPermissionScreen

**Code Requirements:**
- 4 TextInput refs managed separately
- Auto-focus logic using useEffect
- Countdown timer using useEffect + interval
- Error state management
- Export as src/screens/Auth/OTPScreen.tsx

### Screen 4: LocationPermissionScreen
**Purpose:** Request location permission for doorstep service
- UI:
  - Large blue location pin icon (100x100px, centered)
  - Heading: "Enable Location"
  - Subtext: "We need your location to provide doorstep service"
  - Two buttons:
    a) "Use Current Location" (primary, teal background, full-width)
    b) "Enter Location Manually" (secondary, outline style, full-width)

**Current Location Flow:**
- Click "Use Current Location" → show loading spinner
- Request permission: Location.requestForegroundPermissionsAsync()
- If status === "granted":
  - Get current location: Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
  - Extract: { latitude, longitude }
  - Reverse geocode: Location.reverseGeocodeAsync({ latitude, longitude })
  - Extract address fields: street, city, district, country, formattedAddress
  - Show modal/dialog to confirm and label address (e.g., "Home", "Office")
  - Save to Firestore and Zustand
- If status !== "granted":
  - Show error toast: "Location permission denied. Please enter manually."
  - Fall through to manual entry

**Manual Entry Flow:**
- Click "Enter Location Manually" → navigate to AddAddressScreen (form mode)
- User enters full address in text area
- On save: geocode address to lat/lng, save to Firestore and Zustand

**On Success:**
- Store in addressStore: { currentAddress, currentLatitude, currentLongitude }
- Navigate to HomeScreen (MainStack)

**Code Requirements:**
- Use expo-location API
- Proper error handling for permission denied
- Reverse geocoding with fallback
- Zustand addressStore updates
- Export as src/screens/Auth/LocationPermissionScreen.tsx

### Screen 5: HomeScreen
**Purpose:** Display vendor and services, allow service selection
- Top Section:
  - "DELIVER TO" label with dropdown showing current address (e.g., "123 Business Park, Sector 5, Delhi")
  - Dropdown opens AddressListScreen (modal) to change address or add new
- Greeting:
  - "Hey [userName], Good [time]!" where time is:
    - "Good Morning!" (6 AM - 12 PM)
    - "Good Afternoon!" (12 PM - 6 PM)
    - "Good Evening!" (6 PM - 10 PM)
    - "Good Night!" (10 PM - 6 AM)
- Promo Banner:
  - Horizontal FlatList carousel showing 1-3 promotions
  - Each promo: "50% OFF - First Time Users" style with icon and gradient background
- Services Grid (2x2):
  - 4 service tiles displayed as a grid (2 columns, 2 rows)
  - Services: Wash & Fold, Wash & Iron, Blanket Wash, Subscription
  - Each tile shows:
    - Icon (emoji or icon from react-native-vector-icons)
    - Service name
    - Colored background (light pastel colors for each service)
  - Tap tile → navigate to ServiceDetailScreen with { serviceId }
- On Load:
  - Fetch vendor data from Firestore: /vendors/vendor_1
  - Fetch services: /vendors/vendor_1/services (get all subcollection docs)
  - Show loading spinner while fetching
  - Handle errors: show error message with retry button

**Code Requirements:**
- Use React Navigation Tab Navigator (Home as first tab)
- Fetch vendor + services on component mount
- Real-time greeting calculation
- Grid layout using FlatList with numColumns={2}
- Error boundary with retry logic
- Export as src/screens/Main/HomeScreen.tsx

### Screen 6: ServiceDetailScreen
**Purpose:** Select service options and calculate price
- Header: Back button (navigate back)
- Service Card:
  - Service name (e.g., "Wash and Fold")
  - "Recommended" badge (if applicable)
  - Colored background matching service tile color
- Weight Selection:
  - Heading: "Select an estimated weight"
  - Radio button options (mutually exclusive):
    a) "~6 kg (~20 clothes)" - Price: "₹299"
    b) "~7-13kg (~35 clothes)" - Price: "₹499"
  - Default: First option pre-selected
  - Store selected weight in orderStore
- Toggles Section:
  - **Toggle 1: "Need Ironing?"** (OFF by default)
    - When OFF: toggle hidden, no ironing counter shown
    - When ON: show counter below toggle
      - Label: "Number of clothes to iron (₹10 per cloth)"
      - Display: "-" button | "0" (number) | "+" button | "₹0 extra" (price)
      - User can click +/- to increase/decrease
      - Price updates dynamically: ironingCount × 10
  - **Toggle 2: "Schedule later?"** (OFF by default)
    - When OFF: no date picker shown
    - When ON: show date picker (calendar widget)
      - Allow selecting any date from today onwards
      - Disable past dates
      - Show selected date prominently
- Special Instructions:
  - Text area with placeholder: "Add any special instructions..."
  - Optional field
- Media Buttons (Bottom):
  - Show 3 buttons: "Image", "Video", "Voice"
  - For MVP: buttons are visible but non-functional (no action on click)
- Price Display:
  - Always visible at bottom: "Total: ₹[calculated]"
  - Calculation: basePrice (from weight) + (ironingCount × 10)
  - Update dynamically when user changes options
- Action Button:
  - "Add to Cart" or "Proceed to Address"
  - On click:
    - Save all selections to orderStore
    - Reset form for next order
    - Navigate to AddressListScreen

**Code Requirements:**
- Radio buttons using React Native Picker or custom implementation
- Conditional rendering for toggles
- Dynamic price calculation and display
- Date picker using react-native-date-picker library
- Form state management in orderStore (Zustand)
- Export as src/screens/Main/ServiceDetailScreen.tsx

### Screen 7: AddAddressScreen (Form) + AddressListScreen (Modal)
**Purpose:** Manage saved addresses and add new addresses

**AddAddressScreen (Full Form):**
- Layout:
  - Back button → navigate back
  - "Add Address" heading
  - "Save a new address for future orders" subtext
- Form Fields:
  - Address input (text area, multiline, 3-4 lines tall)
    - Placeholder: "Enter your full address"
    - Auto-filled if coming from LocationPermissionScreen (reverse geocode result)
  - Label input (single line)
    - Placeholder: "Home, Office, etc."
    - Suggestions: Home, Office, Other
  - Checkbox: "Set as primary address"
- Buttons:
  - "Save Address" (primary, teal)
  - "Cancel" (secondary, outline)
- On Save:
  - Validate: address field not empty, length > 5 characters
  - If geocoding needed: Location.geocodeAsync(address) → get { latitude, longitude }
  - Save to Firestore: /users/{userId}/addresses/{addressId}/ with:
    { label, address, latitude, longitude, isPrimary, createdAt }
  - Update addressStore with new address
  - Close modal or navigate back
  - Show success toast
- On Cancel: Navigate back without saving

**AddressListScreen (Modal):**
- Shows list of saved addresses
- Each address card shows:
  - Label (e.g., "Home")
  - Address text
  - Radio button (select primary address)
  - Edit button (edit existing address - optional for MVP)
  - Delete button (swipe to delete)
- "Add New" button at bottom
  - Tap → navigate to AddAddressScreen
- On address selected:
  - Close modal
  - Update currentAddress in addressStore
  - Return to previous screen (HomeScreen or ServiceDetailScreen)

**Code Requirements:**
- Use react-native-date-picker library
- Modal presentation (bottom sheet or full screen)
- Form validation (address > 5 chars, label optional but recommended)
- Firestore document creation with auto-generated IDs
- Export as:
  - src/screens/Main/AddAddressScreen.tsx
  - src/screens/Main/AddressListScreen.tsx

### Screen 8: PickupDetailsScreen
**Purpose:** Select pickup date and time slot
- Layout:
  - Back button → navigate back to ServiceDetailScreen
  - "Schedule Pickup" heading
- Date Picker:
  - Calendar widget (use react-native-date-picker)
  - Show current month by default
  - User selects date (must be today or future, disable past dates)
  - Show selected date prominently: "Selected: [formatted date]"
- Time Slot Selection:
  - Heading: "Select Time Slot"
  - 6 predefined slots (show only future slots if today selected):
    - 8:00 AM - 10:00 AM
    - 10:00 AM - 12:00 PM
    - 12:00 PM - 2:00 PM
    - 2:00 PM - 4:00 PM
    - 4:00 PM - 6:00 PM
    - 6:00 PM - 8:00 PM
  - Each slot as a card/button
  - Show checkmark on selected slot
  - Selected slot has teal background, others are gray
- Order Summary:
  - Show what's being ordered (from orderStore):
    - Service name, quantity, weight, total price
- Button:
  - "Confirm Pickup"
  - On click:
    - Save pickupDate & pickupTimeSlot to orderStore
    - Navigate to CartReviewScreen

**Code Requirements:**
- react-native-date-picker for calendar
- Time slot filtering based on selected date
- Local time comparison to disable past slots
- Export as src/screens/Main/PickupDetailsScreen.tsx

### Screen 9: CartReviewScreen
**Purpose:** Review complete order before placing
- Heading: "Review Your Order"
- Order Summary Card (bordered):
  - Service: [serviceName] ([quantity][unit])
  - Example: "Wash & Fold (6 kg)"
  - Weight option: "6 kg (~20 clothes)"
  - Ironing (if applicable): "[count] clothes @ ₹10 each" 
  - Pickup Address: [address] (clickable to change)
  - Pickup Date/Time: [formatted date] [timeSlot]
  - Special Instructions: [text] (if provided)
- Price Breakdown:
  - Service Price: ₹X
  - Ironing Price (if applicable): ₹Y
  - **Total: ₹Z** (bold, larger font, teal color)
- Action Button:
  - "Place Order" (primary, full-width)
  - Show loading spinner during submission
- Back button → navigate to PickupDetailsScreen
- On Submit:
  - Validate all required fields from orderStore
  - Call createOrder() function:
    - Save to: /users/{userId}/orders/{auto-generated orderId}
    - Also save to: /vendors/vendor_1/orders/{orderId} (mirror copy)
    - Document fields:
      ```
      {
        vendorId: "vendor_1",
        vendorName: "[vendor name]",
        userId: "[userId]",
        serviceId: "[serviceId]",
        serviceName: "[serviceName]",
        quantity: [number],
        quantityUnit: "[kg|piece]",
        pricePerUnit: [number],
        totalPrice: [number],
        ironingCount: [number],
        pickupAddress: "[address]",
        pickupDate: "[YYYY-MM-DD]",
        pickupTimeSlot: "[8:00 AM - 10:00 AM]",
        specialInstructions: "[text]",
        status: "pending",
        createdAt: [timestamp],
        updatedAt: [timestamp]
      }
      ```
    - On success: Navigate to OrderConfirmationScreen with { orderId }
    - On error: Show error toast with retry option

**Code Requirements:**
- orderStore provides all order data
- Firestore dual-write (user + vendor collections)
- Error handling with user-friendly messages
- Export as src/screens/Main/CartReviewScreen.tsx

### Screen 10: OrderConfirmationScreen
**Purpose:** Confirm order placed successfully
- Success Display:
  - Large green checkmark icon (in circle)
  - "Order Placed Successfully!" heading
  - Order ID displayed prominently: "Order #[SPT-1234567]"
    - Format: "SPT-" + first 7 chars of orderId
- Order Details Card:
  - Service: [serviceName] ([quantity])
  - Price: ₹[totalPrice]
  - Pickup Address: [address]
  - Pickup Date/Time: [date] [timeSlot]
  - Vendor Name: [vendorName]
  - Vendor Phone: [phone] (clickable to call)
- Buttons:
  a) "Track Order" (primary, teal)
     - Navigate to OrderDetailScreen with { orderId }
  b) "Place Another Order" (secondary, outline)
     - Reset orderStore.reset()
     - Reset all form states
     - Navigate back to HomeScreen
- Navigation: Receive orderId as route parameter

**Code Requirements:**
- Route params handling for orderId
- Phone call on vendor phone click (Linking.openURL('tel:...'))
- Navigation reset logic
- Export as src/screens/Main/OrderConfirmationScreen.tsx

### Screen 11: MyOrdersScreen
**Purpose:** Show order history and allow tracking
- Tab: Part of bottom tab navigation (3 tabs: Home, Orders, Profile)
- Heading: "My Orders"
- On Load:
  - Fetch all orders from /users/{userId}/orders/
  - Query: orderBy('createdAt', 'desc') → newest first
  - Show loading spinner while fetching
- Orders List:
  - Each order card shows:
    - Order ID: "Order #[ID]"
    - Service Name: "[serviceName]"
    - Quantity: "6 kg"
    - Price: "₹[totalPrice]"
    - Status badge:
      - pending: gray background
      - picked: blue background
      - processing: yellow background
      - ready: green background
      - delivered: green background
    - Date: Formatted as "Nov 30, 2025"
  - Tap card → Navigate to OrderDetailScreen with { orderId }
- Empty State:
  - If no orders: Show illustration + "No orders yet"
  - Message: "Start by booking a service!"
  - Button: "Browse Services" → navigate to HomeScreen
- Error Handling:
  - Show error message if fetch fails
  - "Retry" button to refetch
- Real-time Updates:
  - Listen to /users/{userId}/orders/ collection
  - Update list when new orders added or status changes

**Code Requirements:**
- FlatList with refreshControl for pull-to-refresh
- Real-time listener using onSnapshot()
- Status color mapping
- Export as src/screens/Main/MyOrdersScreen.tsx

### Screen 12: OrderDetailScreen
**Purpose:** Show full order details and status tracking
- Header:
  - Order ID: "Order #[ID]"
  - Status badge (colored): "[STATUS]"
    - Mapping: pending=gray, picked=blue, processing=yellow, ready=green, delivered=dark green
- Order Details Section:
  - Service: [serviceName] ([quantity][unit])
  - Price: ₹[totalPrice]
  - Ironing (if applicable): "[count] clothes @ ₹10 each"
  - Special Instructions (if provided): "[text]"
- Pickup Details Section:
  - Address: [pickupAddress]
  - Date/Time: [formatted date] [timeSlot]
  - Contact Vendor: [phone] (clickable to dial)
- Status Timeline:
  - Vertical timeline showing 5 stages:
    1. Pending (clock icon) - always shown
    2. Picked (checkmark icon) - shown if status >= picked
    3. Processing (wrench/gear icon) - shown if status >= processing
    4. Ready (package icon) - shown if status >= ready
    5. Delivered (checkmark icon) - shown if status = delivered
  - Completed stages: green checkmark + green line
  - Pending stages: gray icon + gray line
  - Current stage: highlight with animation or larger size
- Real-time Updates:
  - Listen to /users/{userId}/orders/{orderId}
  - Update UI when status changes (show snackbar "Order status updated")
- Cancel Button (only if status = pending):
  - "Cancel Order" button at bottom
  - On click:
    - Show confirmation dialog
    - Update status to "cancelled"
    - Show success toast
- Back button → navigate back to MyOrdersScreen

**Code Requirements:**
- Real-time Firestore listener
- Custom timeline component
- Conditional rendering based on status
- Phone call functionality
- Export as src/screens/Main/OrderDetailScreen.tsx

### Screen 13: Navigation & Bottom Tab
**Purpose:** Connect all screens with proper navigation
- Use React Navigation Stack Navigator for Auth flow
- Use React Navigation Bottom Tab Navigator for Main app
- Tabs (when logged in):
  1. Home (HomeScreen)
  2. Orders (MyOrdersScreen)
  3. Profile (ProfileScreen - simple: Show user info + logout button)

**Navigation Flow:**
```
RootNavigator
├── AuthStack (when not logged in)
│   ├── OnboardingCarousel
│   ├── WelcomeBackScreen
│   ├── OTPScreen
│   └── LocationPermissionScreen
└── MainStack (when logged in, with BottomTabNavigator)
    ├── HomeStack
    │   ├── HomeScreen
    │   ├── ServiceDetailScreen
    │   ├── PickupDetailsScreen
    │   ├── AddressListScreen
    │   ├── AddAddressScreen
    │   ├── CartReviewScreen
    │   └── OrderConfirmationScreen
    ├── OrdersStack
    │   ├── MyOrdersScreen
    │   └── OrderDetailScreen
    └── ProfileStack
        └── ProfileScreen
```

**Code Requirements:**
- navigationContainer setup
- Conditional rendering based on authStore.isLoggedIn
- Stack navigator configuration
- Tab navigator with icons and labels
- Export as src/navigation/RootNavigator.tsx

---

## 💾 FIRESTORE DATABASE STRUCTURE

Create these collections and documents manually in Firebase Console:

### /vendors/vendor_1/
```json
{
  "name": "Clean Express Laundry",
  "phone": "+919988776655",
  "address": "456 Service Road, Bangalore",
  "active": true
}
```

### /vendors/vendor_1/services/ (Create 5 documents)
```json
// Document: wash_fold
{
  "name": "Wash & Fold",
  "description": "Regular wash and fold service",
  "icon": "🧺",
  "pricePerUnit": 50,
  "unit": "kg"
}

// Document: wash_iron
{
  "name": "Wash & Iron",
  "description": "Wash, dry, and iron service",
  "icon": "👕",
  "pricePerUnit": 100,
  "unit": "kg"
}

// Document: shoe_clean
{
  "name": "Shoe Cleaning",
  "description": "Professional shoe cleaning",
  "icon": "👟",
  "pricePerUnit": 200,
  "unit": "piece"
}

// Document: bag_clean
{
  "name": "Bag Cleaning",
  "description": "Bag and luggage cleaning",
  "icon": "👜",
  "pricePerUnit": 150,
  "unit": "piece"
}

// Document: dry_clean
{
  "name": "Dry Cleaning",
  "description": "Premium dry cleaning service",
  "icon": "🧥",
  "pricePerUnit": 300,
  "unit": "kg"
}
```

### /users/{userId}/ (Auto-created on first login)
```json
{
  "phone": "+919999999999",
  "name": "User Name",
  "createdAt": "timestamp"
}
```

### /users/{userId}/addresses/ (User creates by adding addresses)
```json
{
  "label": "Home",
  "address": "123 Main Street, Bangalore",
  "latitude": 12.9716,
  "longitude": 77.6412,
  "isPrimary": true,
  "createdAt": "timestamp"
}
```

### /users/{userId}/orders/ (Auto-created when user places order)
```json
{
  "vendorId": "vendor_1",
  "vendorName": "Clean Express Laundry",
  "serviceId": "wash_fold",
  "serviceName": "Wash & Fold",
  "quantity": 6,
  "quantityUnit": "kg",
  "pricePerUnit": 50,
  "totalPrice": 300,
  "ironingCount": 0,
  "pickupAddress": "123 Main Street, Bangalore",
  "pickupDate": "2025-12-01",
  "pickupTimeSlot": "10:00 AM - 12:00 PM",
  "specialInstructions": "Use mild detergent",
  "status": "pending",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### /vendors/vendor_1/orders/ (Mirror copy of user orders)
```json
{
  "userId": "[userId]",
  "userPhone": "+919999999999",
  "serviceId": "wash_fold",
  "serviceName": "Wash & Fold",
  "quantity": 6,
  "quantityUnit": "kg",
  "totalPrice": 300,
  "ironingCount": 0,
  "pickupAddress": "123 Main Street, Bangalore",
  "pickupDate": "2025-12-01",
  "pickupTimeSlot": "10:00 AM - 12:00 PM",
  "specialInstructions": "Use mild detergent",
  "status": "pending",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## 🛠 TECH STACK & SETUP

### Dependencies (Install all)
```bash
npm install \
  @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context react-native-gesture-handler \
  firebase zustand react-native-paper \
  expo-location react-native-date-picker moment \
  react-native-vector-icons
```

### Project Structure
```
src/
├── screens/
│   ├── Auth/
│   │   ├── OnboardingCarousel.tsx
│   │   ├── WelcomeBackScreen.tsx
│   │   ├── OTPScreen.tsx
│   │   └── LocationPermissionScreen.tsx
│   └── Main/
│       ├── HomeScreen.tsx
│       ├── ServiceDetailScreen.tsx
│       ├── AddAddressScreen.tsx
│       ├── AddressListScreen.tsx
│       ├── PickupDetailsScreen.tsx
│       ├── CartReviewScreen.tsx
│       ├── OrderConfirmationScreen.tsx
│       ├── MyOrdersScreen.tsx
│       ├── OrderDetailScreen.tsx
│       └── ProfileScreen.tsx
├── navigation/
│   └── RootNavigator.tsx
├── services/
│   ├── firebase.ts
│   ├── auth.ts
│   └── firestore.ts
├── store/
│   ├── authStore.ts
│   ├── addressStore.ts
│   ├── orderStore.ts
│   └── index.ts
├── types/
│   └── index.ts
├── utils/
│   └── constants.ts
├── components/
│   ├── Loading.tsx
│   ├── ErrorBoundary.tsx
│   └── CustomComponents.tsx
└── App.tsx
```

---

## 🎨 DESIGN SYSTEM

### Colors (Use everywhere)
```typescript
export const COLORS = {
  primary: '#2BA084',           // Teal - main actions
  secondary: '#F5F5F5',         // Light gray - backgrounds
  accent: '#FF6B35',            // Orange - highlights
  text: '#1F1F1F',              // Dark gray - body text
  textSecondary: '#666666',     // Medium gray - secondary text
  border: '#E0E0E0',            // Light border
  error: '#B3261E',             // Red - errors
  success: '#188038',           // Green - success
  warning: '#F57F17',           // Orange - warning
  info: '#1976D2',              // Blue - info
  background: '#FFFFFF',        // White background
  disabled: '#CCCCCC',          // Disabled state
  cardBg: '#F9F9F9',            // Card background
  // Service tile backgrounds
  service1: '#E3F2FD',          // Wash & Fold - light blue
  service2: '#F3E5F5',          // Wash & Iron - light purple
  service3: '#E8F5E9',          // Blanket Wash - light green
  service4: '#E0F2F1',          // Subscription - light cyan
};
```

### Typography
```typescript
export const FONTS = {
  heading: { fontSize: 24, fontWeight: '600' },
  subheading: { fontSize: 18, fontWeight: '500' },
  body: { fontSize: 14, fontWeight: '400' },
  bodySmall: { fontSize: 12, fontWeight: '400' },
  buttonText: { fontSize: 14, fontWeight: '600' },
};
```

### Spacing
```typescript
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

---

## 🔑 STATE MANAGEMENT (Zustand Stores)

### authStore.ts
```typescript
// State
user: { uid, phone, name } | null
isLoggedIn: boolean
loading: boolean
error: string | null

// Methods
setUser(userData)
clearUser()
setLoading(bool)
setError(error)
logout()
```

### addressStore.ts
```typescript
// State
currentAddress: string
currentLatitude: number
currentLongitude: number
savedAddresses: Array<{id, label, address, latitude, longitude, isPrimary}>

// Methods
setCurrentAddress(address, lat, lng)
clearCurrentAddress()
addAddress(label, address, lat, lng)
removeAddress(id)
setPrimaryAddress(id)
```

### orderStore.ts
```typescript
// State
serviceId: string
serviceName: string
quantity: number
quantityUnit: string
pricePerUnit: number
basePrice: number
ironingCount: number
specialInstructions: string
pickupDate: string
pickupTimeSlot: string
totalPrice: number

// Methods
setService(id, name, pricePerUnit, unit)
setQuantity(qty)
setIroningCount(count)
setSpecialInstructions(text)
setPickupDate(date)
setPickupTimeSlot(slot)
calculateTotalPrice()
reset()
```

---

## 📱 FIREBASE SETUP

### Step 1: Firebase Configuration
In `services/firebase.ts`:
```typescript
export const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "spinit-mvp.firebaseapp.com",
  projectId: "spinit-mvp",
  storageBucket: "spinit-mvp.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
initializeApp(FIREBASE_CONFIG);
export const auth = getAuth();
export const db = getFirestore();
```

### Step 2: Phone Auth Setup
- Go to Firebase Console → Authentication → Phone
- Enable Phone Authentication
- Add test phone numbers for development (optional)
- Copy Web API Key

### Step 3: Firestore Security Rules
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write only their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /addresses/{addressId} {
        allow read, write: if request.auth.uid == userId;
      }
      match /orders/{orderId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Vendors readable by all, orders readable by anyone
    match /vendors/{vendorId} {
      allow read: if true;
      allow write: if false;
      match /services/{serviceId} {
        allow read: if true;
      }
      match /orders/{orderId} {
        allow read: if true;
        allow write: if false;
      }
    }
    
    // Config readable by all
    match /config/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## 🎬 BUILDING INSTRUCTIONS (14 Cursor Messages)

### Message 1: Generate OnboardingCarousel.tsx
```
Generate the OnboardingCarousel screen with:
- 2 horizontally scrollable slides
- Slide 1: "Your Weekend is to Live" with laundry illustration
- Slide 2: "Fast, Affordable, Hygienic" with delivery illustration
- Dots indicator (3 dots: current is filled blue, others are gray)
- NEXT button goes to next slide, last slide goes to WelcomeBackScreen
- Skip link goes directly to WelcomeBackScreen
- Use FlatList with horizontal={true} for scrolling
- Smooth animations
- Use COLORS from design system
- Export as src/screens/Auth/OnboardingCarousel.tsx
```

### Message 2: Generate WelcomeBackScreen.tsx
```
Generate WelcomeBackScreen with:
- "Welcome Back!" heading
- Full Name input with person icon (required, min 2 chars)
- Phone Number input with +91 prefix (auto-format to 10 digits)
- Terms checkbox with blue linked text
- Continue button (disabled until all valid)
- Form validation: name required, phone exactly 10 digits, checkbox checked
- On submit: Firebase signInWithPhoneNumber(), navigate to OTPScreen if success
- Show loading spinner during auth
- Error toast if sign-in fails
- Use React Native Paper components
- Export as src/screens/Auth/WelcomeBackScreen.tsx
```

### Message 3: Generate OTPScreen.tsx
```
Generate OTPScreen with:
- Display: "Verify OTP - Enter the 4-digit code sent to +91 [last 4 digits]"
- 4 separate input boxes (each accepts 1 digit only)
- Auto-focus to next box when digit entered
- Backspace clears current and focuses previous
- Countdown timer: "Resend code in 30s" (disable at 0)
- Resend button appears when countdown finishes
- Allow max 3 resend attempts
- Invalid OTP: show red error message
- Max 3 failed attempts: show Contact Support link
- Loading spinner during verification
- On correct OTP: save user to Firestore /users/{uid}/, navigate to LocationPermissionScreen
- Export as src/screens/Auth/OTPScreen.tsx
```

### Message 4: Generate LocationPermissionScreen.tsx
```
Generate LocationPermissionScreen with:
- Large blue location pin icon (100x100)
- "Enable Location" heading
- "We need your location to provide doorstep service" subtext
- Two buttons: "Use Current Location" (primary teal) and "Enter Location Manually" (outline)
- Use Current Location: Request permission, get current location, reverse geocode to address
- If permission denied: show error, fall back to manual entry
- Manual Entry: navigate to AddAddressScreen
- On success: save to addressStore, navigate to HomeScreen
- Use expo-location API
- Export as src/screens/Auth/LocationPermissionScreen.tsx
```

### Message 5: Generate Zustand Stores
```
Generate three Zustand store files:

1. src/store/authStore.ts:
   - State: user, isLoggedIn, loading, error
   - Methods: setUser(), clearUser(), setLoading(), setError(), logout()

2. src/store/addressStore.ts:
   - State: currentAddress, currentLatitude, currentLongitude, savedAddresses
   - Methods: setCurrentAddress(), addAddress(), removeAddress(), setPrimaryAddress()

3. src/store/orderStore.ts:
   - State: serviceId, serviceName, quantity, quantityUnit, pricePerUnit, basePrice, ironingCount, specialInstructions, pickupDate, pickupTimeSlot, totalPrice
   - Methods: setService(), setQuantity(), setIroningCount(), setSpecialInstructions(), setPickupDate(), setPickupTimeSlot(), calculateTotalPrice(), reset()

4. src/store/index.ts:
   - Export all stores

Include full TypeScript types for all state objects.
```

### Message 6: Generate HomeScreen.tsx
```
Generate HomeScreen with:
- Top section: "DELIVER TO" dropdown showing current address
- Greeting: "Hey [name], Good [Morning/Afternoon/Evening]!" based on time
- Promo carousel: 1-3 promotions showing horizontally
- Services grid: 2x2 grid of service tiles
  - Wash & Fold (light blue bg)
  - Wash & Iron (light purple bg)
  - Blanket Wash (light green bg)
  - Subscription (light cyan bg)
- Each tile: icon + name + colored background
- Tap tile: navigate to ServiceDetailScreen with serviceId
- On load: fetch vendor data and services from Firestore /vendors/vendor_1/
- Show loading spinner while fetching
- Handle errors with retry button
- Use React Navigation Tab Navigator (Home is first tab)
- Export as src/screens/Main/HomeScreen.tsx
```

### Message 7: Generate ServiceDetailScreen.tsx
```
Generate ServiceDetailScreen with:
- Back button in header
- Service card showing name and "Recommended" badge
- Weight Selection: Radio buttons
  - ~6 kg (~20 clothes) - ₹299
  - ~7-13kg (~35 clothes) - ₹499
  - Default: first selected
- Toggle "Need Ironing?" (OFF by default)
  - When ON: show counter with +/- buttons
  - Show: "Number of clothes to iron (₹10 per cloth)"
  - Display dynamic price: count × 10
- Toggle "Schedule later?" (OFF by default)
  - When ON: show date picker (react-native-date-picker)
- Special instructions: text area (optional)
- Media buttons: Image, Video, Voice (visible but non-functional for MVP)
- Price display: "Total: ₹[calculated]" at bottom
- "Add to Cart" button: save to orderStore, navigate to AddressListScreen
- Export as src/screens/Main/ServiceDetailScreen.tsx
```

### Message 8: Generate AddAddressScreen.tsx
```
Generate AddAddressScreen with:
- "Add Address" heading
- Address input: text area (multiline)
  - Auto-filled if from LocationPermissionScreen reverse geocode
- Label input: suggestions "Home", "Office", "Other"
- Checkbox: "Set as primary address"
- Save button: validate address > 5 chars, geocode if needed, save to Firestore /users/{uid}/addresses/, show success toast
- Cancel button: navigate back
- Error handling: show error if geocoding fails
- Export as src/screens/Main/AddAddressScreen.tsx
```

### Message 9: Generate AddressListScreen.tsx
```
Generate AddressListScreen (Modal) with:
- List of saved addresses
- Each card: label + address + radio button + delete swipe
- "Add New" button at bottom
- Tap card: set as current address, close modal
- Tap "Add New": navigate to AddAddressScreen
- Empty state: "No addresses saved yet"
- Export as src/screens/Main/AddressListScreen.tsx
```

### Message 10: Generate PickupDetailsScreen.tsx
```
Generate PickupDetailsScreen with:
- Date picker (react-native-date-picker): disable past dates, show current month
- Show selected date prominently
- Time slot selection: 6 predefined slots
  - Hide past slots if today selected
  - Show checkmark on selected slot
- Order summary: show service name, quantity, total price
- "Confirm Pickup" button: save date/time to orderStore, navigate to CartReviewScreen
- Export as src/screens/Main/PickupDetailsScreen.tsx
```

### Message 11: Generate CartReviewScreen.tsx
```
Generate CartReviewScreen with:
- Order summary card showing:
  - Service name, quantity, weight
  - Ironing details (if applicable)
  - Pickup address (clickable to change)
  - Pickup date/time
  - Special instructions (if provided)
- Price breakdown:
  - Service Price: ₹X
  - Ironing Price: ₹Y (if applicable)
  - Total: ₹Z (bold, teal, larger font)
- "Place Order" button: validate all fields, save to Firestore /users/{uid}/orders/ AND /vendors/vendor_1/orders/, navigate to OrderConfirmationScreen
- Show loading spinner during submission
- Error handling: show error toast with retry
- Export as src/screens/Main/CartReviewScreen.tsx
```

### Message 12: Generate OrderConfirmationScreen.tsx
```
Generate OrderConfirmationScreen with:
- Green checkmark icon
- "Order Placed Successfully!" heading
- Order ID: "Order #[SPT-1234567]" (format: SPT-first 7 chars)
- Order details card: service, price, address, date/time, vendor name, vendor phone
- Two buttons:
  - "Track Order": navigate to OrderDetailScreen
  - "Place Another Order": reset orderStore, navigate to HomeScreen
- Vendor phone is clickable (Linking.openURL to dial)
- Export as src/screens/Main/OrderConfirmationScreen.tsx
```

### Message 13: Generate MyOrdersScreen.tsx + OrderDetailScreen.tsx
```
Generate two screens:

1. MyOrdersScreen.tsx:
   - Tab: part of bottom tab navigation
   - Fetch all orders from /users/{uid}/orders/ (orderBy createdAt desc)
   - Show loading spinner
   - Each order card: Order #, service, price, status badge, date
   - Tap card: navigate to OrderDetailScreen
   - Empty state: "No orders yet. Browse Services" button
   - Pull-to-refresh support
   - Real-time listener: update when orders change

2. OrderDetailScreen.tsx:
   - Order ID + status badge (colored by status)
   - Full order details: service, price, address, date/time, special instructions
   - Vendor phone (clickable to dial)
   - Status timeline: 5 stages (pending→picked→processing→ready→delivered)
   - Completed stages: green checkmark, pending: gray
   - Real-time listener: update when status changes
   - Cancel button (only if status = pending)
   - Export both in src/screens/Main/
```

### Message 14: Generate RootNavigator.tsx + ProfileScreen.tsx
```
Generate navigation structure:

1. RootNavigator.tsx:
   - Conditional rendering: AuthStack if not logged in, MainStack if logged in
   - AuthStack:
     - OnboardingCarousel
     - WelcomeBackScreen
     - OTPScreen
     - LocationPermissionScreen
   - MainStack (with BottomTabNavigator):
     - Home tab: HomeScreen → ServiceDetailScreen → PickupDetailsScreen → CartReviewScreen → OrderConfirmationScreen
     - Orders tab: MyOrdersScreen → OrderDetailScreen
     - Profile tab: ProfileScreen
   - Listen to authStore.isLoggedIn to decide which stack to show

2. ProfileScreen.tsx:
   - Show user info: name, phone
   - "Logout" button: authStore.clearUser(), navigate to auth
   - "Saved Addresses" link: navigate to AddressListScreen
   - "About" link: show version
   - Export both in src/

Complete the full navigation structure with proper stack and tab configuration.
```

---

## ✅ FIRESTORE OPERATIONS (Key Functions)

### In services/firestore.ts, implement:

```typescript
// Get vendor data
export async function getVendor(vendorId) {
  return getDoc(doc(db, 'vendors', vendorId));
}

// Get vendor services
export async function getVendorServices(vendorId) {
  return getDocs(collection(db, 'vendors', vendorId, 'services'));
}

// Create new user
export async function createUser(userId, phone, name) {
  await setDoc(doc(db, 'users', userId), {
    phone, name, createdAt: new Date()
  });
}

// Add address
export async function addAddress(userId, label, address, latitude, longitude) {
  return addDoc(collection(db, 'users', userId, 'addresses'), {
    label, address, latitude, longitude, isPrimary: false, createdAt: new Date()
  });
}

// Get user addresses
export async function getUserAddresses(userId) {
  return getDocs(collection(db, 'users', userId, 'addresses'));
}

// Create order (dual write)
export async function createOrder(userId, orderData) {
  const orderId = doc(collection(db, 'users', userId, 'orders')).id;
  
  const orderWithTimestamp = {
    ...orderData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Save to user orders
  await setDoc(doc(db, 'users', userId, 'orders', orderId), orderWithTimestamp);
  
  // Mirror to vendor orders
  await setDoc(doc(db, 'vendors', orderData.vendorId, 'orders', orderId), {
    ...orderWithTimestamp,
    userId
  });
  
  return orderId;
}

// Get user orders
export async function getUserOrders(userId) {
  const q = query(
    collection(db, 'users', userId, 'orders'),
    orderBy('createdAt', 'desc')
  );
  return getDocs(q);
}

// Get single order
export async function getOrder(userId, orderId) {
  return getDoc(doc(db, 'users', userId, 'orders', orderId));
}

// Update order status
export async function updateOrderStatus(userId, ordorId, status) {
  const vendorId = 'vendor_1';
  const timestamp = new Date();
  
  // Update user order
  await updateDoc(doc(db, 'users', userId, 'orders', orderId), {
    status,
    updatedAt: timestamp
  });
  
  // Update vendor order
  await updateDoc(doc(db, 'vendors', vendorId, 'orders', orderId), {
    status,
    updatedAt: timestamp
  });
}
```

---

## 🧪 TESTING CHECKLIST

### Auth Flow
- [ ] OnboardingCarousel scrolls and navigates
- [ ] WelcomeBackScreen validates phone format
- [ ] OTPScreen shows 4 digit boxes with auto-focus
- [ ] Countdown timer works and resend works
- [ ] LocationPermissionScreen requests GPS or allows manual entry
- [ ] User data saves to Firestore

### Home & Services
- [ ] HomeScreen loads vendor and services
- [ ] Service tiles show correct colors and navigate to detail
- [ ] ServiceDetailScreen calculates price correctly
- [ ] Toggles show/hide content
- [ ] Ironing counter adds ₹10 per cloth

### Address & Pickup
- [ ] AddAddressScreen saves address with geocoding
- [ ] AddressListScreen shows saved addresses
- [ ] PickupDetailsScreen disables past dates
- [ ] Time slots show/hide based on date
- [ ] Selections save to orderStore

### Order Placement
- [ ] CartReviewScreen shows complete summary
- [ ] Price calculation is correct
- [ ] Place Order saves to both user and vendor collections
- [ ] OrderConfirmationScreen shows order ID
- [ ] Vendor phone is clickable

### Order Tracking
- [ ] MyOrdersScreen fetches and displays orders
- [ ] OrderDetailScreen shows timeline
- [ ] Real-time updates work (status changes appear immediately)
- [ ] Cancel button works (if status = pending)

### Overall
- [ ] No console errors
- [ ] All screens load without crashes
- [ ] Navigation works between all screens
- [ ] Logout works and clears auth state
- [ ] Works on iOS and Android

---

## 📋 IMPLEMENTATION ORDER

### Week 1 (Auth)
Generate messages 1-5 (OnboardingCarousel, WelcomeBackScreen, OTPScreen, LocationPermissionScreen, Zustand Stores)

### Week 2 (Home & Services)
Generate messages 6-8 (HomeScreen, ServiceDetailScreen, AddAddressScreen/AddressListScreen)

### Week 3 (Pickup)
Generate message 9 (PickupDetailsScreen)

### Week 4 (Orders)
Generate messages 10-11 (CartReviewScreen, OrderConfirmationScreen)

### Week 5 (Tracking)
Generate message 12 (MyOrdersScreen, OrderDetailScreen)

### Week 6 (Navigation & Polish)
Generate message 14 (RootNavigator, ProfileScreen)

---

## 🚀 IMMEDIATE NEXT STEPS

1. **Create Firebase project:**
   - Go to firebase.google.com/console
   - Create new project: "spinit-mvp"
   - Create Firestore Database (asia-south1 region)
   - Enable Phone Authentication

2. **Setup test vendor:**
   - In Firestore Console, create:
     - /vendors/vendor_1 with vendor info
     - /vendors/vendor_1/services with 5 service documents

3. **Initialize Expo:**
   ```bash
   npx create-expo-app spinit
   cd spinit
   npm install (all dependencies listed above)
   ```

4. **Setup project structure:**
   - Create all folders: src/screens, src/services, src/store, src/navigation, src/types, src/utils, src/components

5. **Start building:**
   - Copy this entire prompt into Cursor
   - Follow the 14 messages in order
   - Test each screen immediately after generation
   - Move to next message only when current screen works

---

## 🎯 SUCCESS INDICATORS

✅ Week 1: Can complete auth flow and see HomeScreen
✅ Week 2: Can select services and options
✅ Week 3: Can add address and select pickup time
✅ Week 4: Can place order and see confirmation
✅ Week 5: Can view orders and track status
✅ Week 6: All screens working, ready to test on real device
✅ Week 7-10: Deploy to TestFlight/Play Store, real users using app

---

## ⚠️ CRITICAL NOTES

- **No Geolocation Queries**: This is NOT a marketplace. You're not finding vendors near user. Users just book from one vendor.
- **No GPS Tracking**: Orders don't have live GPS. Just status updates (pending→picked→processing→ready→delivered).
- **No Complex Indexing**: Keep Firestore queries simple.
- **No Browser Storage**: Use Zustand for all state (localStorage will fail in sandbox).
- **Design System**: Always use COLORS from constants. Never hardcode colors.
- **Error Handling**: Every Firebase operation must have try-catch and show user-friendly message.
- **Loading States**: Every async operation shows spinner until complete.
- **Real Device Testing**: Test on iPhone or Android device, NOT just emulator. GPS/permissions work better on real devices.

---

**You're ready. Copy this entire prompt into Cursor and start with Message 1. Good luck! 🚀**

