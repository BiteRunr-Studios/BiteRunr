# BiteRunr

A React Native mobile app for coordinating group food orders. Create orders, invite friends, and manage shared meals together.

## Features

- **Group Orders**: Create and manage group food orders with friends
- **Friends System**: Add friends, send/receive friend requests
- **Multi-Location Runs**: Split one group order across multiple pickup spots
- **Receipt Matching**: Parse receipts and assign prices back to order lines
- **Voice Order Entry**: Add order lines by speaking instead of typing
- **Order Settlement**: Track who owes what with settlement status
- **Authentication**: Better Auth with email OTP and optional social sign-in

## Tech Stack

- **Framework**: [Expo](https://expo.dev) (React Native)
- **Backend**: [Convex](https://convex.dev) (real-time database & serverless functions)
- **Styling**: [NativeWind](https://nativewind.dev) (Tailwind CSS for React Native)
- **Navigation**: Expo Router with file-based routing
- **Authentication**: Better Auth with Resend for emails

## Getting Started

### Prerequisites

- Node.js 18+
- iOS Simulator (Mac) or Android Emulator
- Convex account

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   # .env.local
   CONVEX_DEPLOYMENT=<your-convex-deployment>
   EXPO_PUBLIC_CONVEX_URL=<your-convex-url>
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Running on Device

```bash
# iOS
npm run ios

# Android
npm run android

# Physical iPhone (set IPHONE env var to device name)
npm run phone
```

## Project Structure

```
├── app/                  # Expo Router pages
│   ├── (auth)/          # Authentication screens
│   └── (protected)/     # Authenticated screens
│       └── (tabs)/      # Main tab navigation
├── components/          # Reusable UI components
├── convex/              # Convex backend
│   ├── schema.ts        # Database schema
│   ├── orders.ts        # Order mutations/queries
│   ├── receiptScanning.ts
│   ├── payments.ts
│   └── ...
└── lib/                 # Utilities and helpers
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run phone` | Run on physical iPhone |
| `npm run prebuild` | Generate native projects |
