# BiteRunr

BiteRunr is an iOS app that streamlines group food ordering and payment splitting among friends. It helps groups organize orders and simplifies reimbursing the person who paid for the food.

## Features

-   **Group Order Management**: Create and join food ordering groups
-   **Friend System**: Connect with friends and send/accept friend requests
-   **Order Tracking**: Track order status (created, active, completed, cancelled)
-   **Payment Simplification**: Easy way to track who owes what for group orders
-   **User Profiles**: Manage your personal information

## Tech Stack

### Frontend

-   Swift/SwiftUI iOS application
-   Kotlin Android application
-   Supabase for authentication

### Backend

-   Node.js with Hono framework
-   Supabase(PostgreSQL) database with Drizzle ORM
-   OpenAPI/Swagger for API documentation
-   Supabase for authentication

## Project Structure

-   `/BiteRunr` - Kotlin Multiplatform App
-   `/BiteClubAPI` - Node.js backend API

## Models

The app uses several interconnected data models:

- **UserProfile**: Core user profile data and social connections.
- **OrderDTO**: Group food orders with status, creator, and participants.
- **OrderItem**: Individual food items linked to users and locations.
- **Location**: Restaurant or venue details.
- **OrderUserDTO**: Users participating in an order.
- **OrderLocationDTO**: Locations associated with an order.
- **FriendRequest**: Pending or resolved friend requests.
- **Friendship**: Confirmed social connections between users.
- **FriendRequestUser**: Lightweight user data for friend request context.
- **ErrorResponse**: Structured backend error with validation details.

These models are designed to support serialization with ‎⁠kotlinx.serialization⁠, cross-platform compatibility, and integration with SwiftUI and Jetpack Compose.

## Getting Started

### Prerequisites

-   iOS device or simulator
-   Android device or simulator
-   Node.js and npm/pnpm
-   PostgreSQL database

### Installation

1. Clone the repository
2. Set up the backend:
    ```
    cd BiteClubAPI
    pnpm install
    ```
3. Configure environment variables (see .env.example)
4. Run database migrations:
    ```
    pnpm drizzle-kit push
    ```
5. Start the backend:
    ```
    pnpm dev
    ```

6. Open the Kotlin Multiplatform app in Android Studio and run it on a simulator or device

---
Copyright (c) 2025 RunrStudios
All rights reserved.

Unauthorized copying, use, or distribution of this code is strictly prohibited.
