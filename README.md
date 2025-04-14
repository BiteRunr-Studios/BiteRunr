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
-   Clerk for authentication

### Backend

-   Node.js with Hono framework
-   Supabase(PostgreSQL) database with Drizzle ORM
-   OpenAPI/Swagger for API documentation
-   Clerk for authentication

## Project Structure

-   `/BiteClub` - iOS SwiftUI app
-   `/BiteClubAPI` - Node.js backend API

## Models

The app uses several interconnected data models:

-   **User**: Profile information
-   **Order**: Group food orders with statuses
-   **OrderItem**: Individual food items in an order
-   **Location**: Restaurant/venue information
-   **OrderUser**: Users participating in an order
-   **OrderLocation**: Locations associated with an order
-   **Friend/FriendRequest**: Social connections between users

## Getting Started

### Prerequisites

-   iOS device or simulator
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
6. Open the iOS app in Xcode and run it on a simulator or device
