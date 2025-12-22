// Order Summary Types
export interface OrderSummary {
    id: string;
    name: string;
    creator_id: string;
    comments: string;
    status: "completed" | "pending" | "cancelled" | string;
    paused: boolean;
    created_at: string;
    updated_at: string;
}

export interface OrderUserProfile {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface OrderUser {
    id: string;
    user_id: string;
    order_id: string;
    status: "ordering" | "done" | string;
    settlement_status: "unpaid" | "paid" | "partial" | string;
    amount_owed: string; // "2.00"
    created_at: string; // ISO
    updated_at: string; // ISO
    user: OrderUserProfile;
}

export interface UserOrderDetails {
    order: OrderSummary;
    order_users: OrderUser[];
    items_count: number;
    people_count: number;
}

// Insert new types:
export type UserProfileType = {
    id: string;
    email: string;
    email_confirmed_at: Date | null;
    profile: {
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
    } | null;
};
