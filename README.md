# BiteRunr

BiteRunr is a React Native mobile app that streamlines group food ordering and payment splitting among friends. It helps groups coordinate orders, scan receipts with AI, and track who owes what.

## Features

- **Group Order Management**: Create orders, add locations, and invite friends to join
- **QR Code Invites**: Share orders via QR codes or alphanumeric invite codes
- **AI Receipt Scanning**: Scan receipts with GPT-4o to automatically extract items and prices
- **Settlement Tracking**: Track payment status per user (unpaid, claimed, confirmed)
- **Friend System**: Send/accept friend requests and manage connections
- **Push Notifications**: Real-time notifications via Expo push notifications
- **Order Status Tracking**: Full order lifecycle (created, active, completed, cancelled)

## Tech Stack

### Frontend

- React Native 0.81 with Expo 54 (Expo Router for file-based routing)
- NativeWind (Tailwind CSS for React Native)
- React Navigation (tabs, drawer)
- Lucide React Native for icons

### Backend

- Convex (real-time database and serverless functions)
- Better Auth (email OTP + OAuth via GitHub/Google)
- Resend for email delivery
- AI SDK with OpenAI (GPT-4o-mini) for receipt parsing

## Project Structure

```
bite-runr-rn/
├── app/                  # Expo Router pages
│   ├── (auth)/           # Sign in, sign up, OTP verification
│   ├── (protected)/      # Authenticated screens
│   │   ├── (tabs)/       # Home, Groups, Account tabs
│   │   ├── order/        # Create, view, manage orders
│   │   └── account/      # Profile, friends, support
│   └── join/             # QR code / invite code entry point
├── components/           # Reusable UI components
├── convex/               # Convex backend (schema, functions, agents)
├── hooks/                # Custom React hooks
├── lib/                  # Utilities, auth helpers
└── assets/               # Static assets
```

## Data Models

- **Users**: Profiles with names and avatars, synced via Better Auth
- **Orders**: Group food orders with status lifecycle and creator tracking
- **Order Items**: Individual items with quantities, prices (in cents), and per-user assignment
- **Order Users**: Participants with ordering status and settlement tracking
- **Locations & Items**: Restaurants/venues and their menu items
- **Friends & Friend Requests**: Social connections between users
- **Order Invites**: Shareable codes with expiry and usage limits

## Getting Started

### Prerequisites

- Node.js (v18+)
- iOS device/simulator or Android device/simulator
- Convex account
- Expo CLI

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd bite-runr-rn
   npm install
   ```
3. Start the Convex dev server:
   ```
   npm run convex:br
   ```
4. Start the Expo dev server:
   ```
   npm run dev
   ```
5. Run on a device or simulator:
   ```
   npm run ios
   # or
   npm run android
   ```

---

Copyright (c) 2025 RunrStudios
All rights reserved.

Unauthorized copying, use, or distribution of this code is strictly prohibited.
